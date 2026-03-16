import { randomUUID } from "crypto";
import { StageExecution } from "../domain/pipeline/StageExecution";
import type { StageTargetType } from "../domain/pipeline/StageExecution";
import type { StageExecutionRepository } from "../domain/pipeline/StageExecutionRepository";
import type { CollectionRepository } from "../domain/collections/CollectionRepository";
import type { DesignItemRepository } from "../domain/design-items/DesignItemRepository";
import type { LLMProvider } from "../domain/providers/LLMProvider";
import type { ImageGenerationProvider } from "../domain/providers/ImageGenerationProvider";
import type { AssetStorage } from "../domain/providers/AssetStorage";
import type { GeneratedImageRepository } from "../domain/generation/GeneratedImageRepository";
import { GeneratedImage } from "../domain/generation/GeneratedImage";
import { stageCatalog } from "../domain/pipeline/stageCatalog";
import { isStageReady } from "../domain/pipeline/stageEligibility";
import { getStagePromptConfig } from "../domain/pipeline/stagePrompts";

export interface RunStageExecutionDeps {
  executionRepo: StageExecutionRepository;
  collectionRepo: CollectionRepository;
  designItemRepo: DesignItemRepository;
  llm: LLMProvider;
  imageProvider?: ImageGenerationProvider;
  storage?: AssetStorage;
  generatedImageRepo?: GeneratedImageRepository;
}

export interface RunStageExecutionInput {
  stageKey: string;
  targetId: string;
  deps: RunStageExecutionDeps;
}

/**
 * runStageExecution é o caso de uso central do pipeline.
 *
 * Fluxo:
 * 1. Valida que o estágio existe no catálogo
 * 2. Verifica eligibilidade (dependências upstream aprovadas)
 * 3. Coleta input de execuções aprovadas das dependências e do alvo
 * 4. Cria um StageExecution em status "running"
 * 5. Chama o LLM com um prompt contextual
 * 6. Salva a execução como "completed" (sucesso) ou "failed" (erro técnico)
 * 7. Retorna a execução final
 */
export async function runStageExecution(
  input: RunStageExecutionInput,
): Promise<StageExecution> {
  const { stageKey, targetId, deps } = input;
  const { executionRepo, collectionRepo, designItemRepo, llm } = deps;

  // 1. Valida que o estágio existe no catálogo (isStageReady lança erro se não encontrar)
  const stage = stageCatalog.find((s) => s.key === stageKey);
  if (!stage) {
    throw new Error(`Stage not found in catalog: "${stageKey}"`);
  }

  // 2. Coleta execuções aprovadas para o targetId
  //    Para estágios de design_item, também busca execuções da collection
  //    (pois dependências upstream podem ser de scope collection).
  const targetExecutions = await executionRepo.findByTargetId(targetId);
  let allExecutions = targetExecutions;

  if (stage.scope === "design_item") {
    const designItem = await designItemRepo.findById(targetId);
    if (designItem) {
      const collectionExecutions = await executionRepo.findByTargetId(
        designItem.collectionId,
      );
      allExecutions = [...targetExecutions, ...collectionExecutions];
    }
  }

  const approvedStageKeys = allExecutions
    .filter((e) => e.status === "approved")
    .map((e) => e.stageKey);

  // 3. Verifica eligibilidade — lança se as dependências não estão aprovadas
  const ready = isStageReady({ stageKey, approvedStageKeys });
  if (!ready) {
    throw new Error(
      `Stage "${stageKey}" is not eligible: upstream dependencies are not approved. ` +
        `Missing: ${stage.dependencies.filter((d) => !approvedStageKeys.includes(d)).join(", ")}`,
    );
  }

  // 4. Determina o targetType a partir do escopo do estágio
  const targetType: StageTargetType =
    stage.scope === "collection" ? "collection" : "design_item";

  // 5. Monta o inputSnapshot com dados do alvo e outputs das dependências aprovadas
  const inputSnapshot = await buildInputSnapshot({
    stageKey,
    targetId,
    targetType,
    approvedExecutions: allExecutions.filter((e) => e.status === "approved"),
    collectionRepo,
    designItemRepo,
  });

  // 6. Cria a execução em status "running"
  const execution = StageExecution.start({
    id: randomUUID(),
    stageKey,
    targetId,
    targetType,
    inputSnapshot,
  });

  await executionRepo.save(execution);

  // 7. Chama o LLM (ou image provider) e transiciona para "completed" ou "failed"
  const promptConfig = getStagePromptConfig(stageKey);

  if (promptConfig.isImageGeneration) {
    return runImageGeneration({
      execution,
      inputSnapshot,
      targetId,
      deps,
    });
  }

  try {
    const userPrompt = promptConfig.buildUserPrompt(inputSnapshot);
    const response = await llm.generateText({
      prompt: userPrompt,
      systemPrompt: promptConfig.systemPrompt,
    });

    const cleanedContent = stripCodeFences(response.content);

    const completed = execution.complete({
      content: cleanedContent,
      provider: response.provider,
      model: response.model,
      usage: response.usage ?? null,
    });

    await executionRepo.save(completed);
    return completed;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const failed = execution.fail(error);
    await executionRepo.save(failed);
    return failed;
  }
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

interface RunImageGenerationInput {
  execution: StageExecution;
  inputSnapshot: Record<string, unknown>;
  targetId: string;
  deps: RunStageExecutionDeps;
}

async function runImageGeneration({
  execution,
  inputSnapshot,
  targetId,
  deps,
}: RunImageGenerationInput): Promise<StageExecution> {
  const { executionRepo, imageProvider, storage, generatedImageRepo } = deps;

  if (!imageProvider || !storage || !generatedImageRepo) {
    const failed = execution.fail(
      new Error("Image generation dependencies (imageProvider, storage, generatedImageRepo) are required"),
    );
    await executionRepo.save(failed);
    return failed;
  }

  try {
    // Extrai o prompt mestre do upstream
    const upstream = inputSnapshot.upstreamOutputs as
      | Record<string, { content?: string }>
      | undefined;
    const masterContent = upstream?.["master-prompt-assembly"]?.content ?? "";
    let masterPrompt = "Generate a t-shirt design";

    try {
      const parsed = JSON.parse(masterContent);
      masterPrompt = parsed.masterPrompt ?? parsed.prompt ?? masterContent;
    } catch {
      if (masterContent) masterPrompt = masterContent;
    }

    const response = await imageProvider.generateImages({
      prompt: masterPrompt,
      count: 2,
    });

    const savedImages: Array<{ imageId: string; filePath: string; provider: string; model: string }> = [];

    for (let i = 0; i < response.images.length; i++) {
      const { data, mimeType } = response.images[i];
      const imageId = randomUUID();
      const ext = mimeType.split("/")[1] ?? "png";
      const filePath = `items/${targetId}/variations/${imageId}.${ext}`;

      await storage.save(filePath, data, mimeType);

      const image = GeneratedImage.create({
        id: imageId,
        designItemId: targetId,
        sourceExecutionId: execution.id,
        filePath,
        promptUsed: masterPrompt,
        provider: response.provider,
        model: response.model,
        metadata: { index: i, mimeType },
        status: "ready",
      });

      await generatedImageRepo.save(image);
      savedImages.push({
        imageId,
        filePath,
        provider: response.provider,
        model: response.model,
      });
    }

    const completed = execution.complete({
      content: JSON.stringify({
        generatedImages: savedImages,
        variationCount: savedImages.length,
        promptUsed: masterPrompt,
      }),
      provider: response.provider,
      model: response.model,
    });

    await executionRepo.save(completed);
    return completed;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const failed = execution.fail(error);
    await executionRepo.save(failed);
    return failed;
  }
}

interface BuildInputSnapshotInput {
  stageKey: string;
  targetId: string;
  targetType: StageTargetType;
  approvedExecutions: StageExecution[];
  collectionRepo: CollectionRepository;
  designItemRepo: DesignItemRepository;
}

async function buildInputSnapshot({
  stageKey,
  targetId,
  targetType,
  approvedExecutions,
  collectionRepo,
  designItemRepo,
}: BuildInputSnapshotInput): Promise<Record<string, unknown>> {
  const snapshot: Record<string, unknown> = { stageKey, targetId };

  // Inclui dados do alvo — falha se não encontrar
  if (targetType === "collection") {
    const collection = await collectionRepo.findById(targetId);
    if (!collection) {
      throw new Error(
        `Collection not found: "${targetId}". O servidor pode ter reiniciado e perdido os dados in-memory.`,
      );
    }
    snapshot.collection = {
      id: collection.id,
      name: collection.name,
      briefing: collection.briefing,
    };
  } else {
    const designItem = await designItemRepo.findById(targetId);
    if (!designItem) {
      throw new Error(
        `DesignItem not found: "${targetId}". O servidor pode ter reiniciado e perdido os dados in-memory.`,
      );
    }
    snapshot.designItem = {
      id: designItem.id,
      name: designItem.name,
      collectionId: designItem.collectionId,
    };
  }

  // Inclui outputs das dependências aprovadas
  const stage = stageCatalog.find((s) => s.key === stageKey);
  if (stage) {
    const upstreamOutputs: Record<string, unknown> = {};
    for (const depKey of stage.dependencies) {
      const depExec = approvedExecutions.find((e) => e.stageKey === depKey);
      if (depExec?.outputSnapshot) {
        upstreamOutputs[depKey] = depExec.outputSnapshot;
      }
    }
    if (Object.keys(upstreamOutputs).length > 0) {
      snapshot.upstreamOutputs = upstreamOutputs;
    }
  }

  return snapshot;
}

/**
 * Remove blocos de código markdown (```json ... ```) que o LLM
 * pode retornar mesmo quando instruído a não usar markdown.
 */
export function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fencePattern = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/;
  const match = trimmed.match(fencePattern);
  return match ? match[1].trim() : trimmed;
}

