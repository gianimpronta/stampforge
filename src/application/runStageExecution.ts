import { randomUUID } from "node:crypto";
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
 * runStageExecution is the core pipeline use case.
 *
 * Flow:
 * 1. Validate the stage exists in the catalog
 * 2. Check eligibility (upstream same-scope deps approved + collectionContext satisfied)
 * 3. Build the input snapshot (target data + upstream outputs + collection context outputs)
 * 4. Create a StageExecution in "running" status
 * 5. Call LLM (or image provider for visual-variation-generation)
 * 6. Save execution as "completed" (success) or "failed" (technical error)
 * 7. Return the final execution
 */
export async function runStageExecution(
  input: RunStageExecutionInput,
): Promise<StageExecution> {
  const { stageKey, targetId, deps } = input;
  const { executionRepo, collectionRepo, designItemRepo } = deps;

  const stage = stageCatalog.find((s) => s.key === stageKey);
  if (!stage) {
    throw new Error(`Stage not found in catalog: "${stageKey}"`);
  }

  const targetType: StageTargetType =
    stage.scope === "collection" ? "collection" : "design_item";

  // Collect approved executions for same-scope target
  const targetExecutions = await executionRepo.findByTargetId(targetId);
  const approvedTargetStageKeys = targetExecutions
    .filter((e) => e.status === "approved")
    .map((e) => e.stageKey);

  // For design_item stages, resolve collectionContext
  let collectionContextOutputs: Record<string, unknown> = {};
  let approvedCollectionExecutionIds = new Set<string>();
  let styleIndex: number | undefined;

  if (stage.scope === "design_item") {
    const designItem = await designItemRepo.findById(targetId);
    if (!designItem) {
      throw new Error(`DesignItem not found: "${targetId}"`);
    }

    const context = designItem.collectionContext;

    for (const [depKey, entry] of Object.entries(context)) {
      if (!entry) continue;
      const exec = await executionRepo.findById(entry.executionId);
      if (exec && exec.status === "approved") {
        approvedCollectionExecutionIds.add(entry.executionId);
        if (exec.outputSnapshot) {
          collectionContextOutputs[depKey] = exec.outputSnapshot;
          if (depKey === "visual-style-definition" && entry.styleIndex !== undefined) {
            styleIndex = entry.styleIndex;
          }
        }
      }
    }

    const ready = isStageReady({
      stageKey,
      approvedStageKeys: approvedTargetStageKeys,
      collectionContext: context,
      approvedCollectionExecutionIds,
    });

    if (!ready) {
      const missingDeps = stage.dependencies.filter(
        (d) => !approvedTargetStageKeys.includes(d),
      );
      const missingCtx = stage.collectionDependencies.filter((d) => {
        const entry = context[d];
        return !entry || !approvedCollectionExecutionIds.has(entry.executionId);
      });
      const missing = [
        ...missingDeps,
        ...missingCtx.map((k) => `collectionContext:${k}`),
      ];
      throw new Error(
        `Stage "${stageKey}" is not eligible: upstream dependencies are not approved. ` +
          `Missing: ${missing.join(", ")}`,
      );
    }
  } else {
    const ready = isStageReady({
      stageKey,
      approvedStageKeys: approvedTargetStageKeys,
    });

    if (!ready) {
      throw new Error(
        `Stage "${stageKey}" is not eligible: upstream dependencies are not approved. ` +
          `Missing: ${stage.dependencies.filter((d) => !approvedTargetStageKeys.includes(d)).join(", ")}`,
      );
    }
  }

  const inputSnapshot = await buildInputSnapshot({
    stageKey,
    targetId,
    targetType,
    approvedExecutions: targetExecutions.filter((e) => e.status === "approved"),
    collectionContextOutputs,
    styleIndex,
    collectionRepo,
    designItemRepo,
  });

  const execution = StageExecution.start({
    id: randomUUID(),
    stageKey,
    targetId,
    targetType,
    inputSnapshot,
  });

  await executionRepo.save(execution);

  const promptConfig = getStagePromptConfig(stageKey);

  if (promptConfig.isImageGeneration) {
    return runImageGeneration({ execution, inputSnapshot, targetId, deps });
  }

  try {
    const userPrompt = promptConfig.buildUserPrompt(inputSnapshot);
    const response = await deps.llm.generateText({
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
// Helpers
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
      new Error(
        "Image generation dependencies (imageProvider, storage, generatedImageRepo) are required",
      ),
    );
    await executionRepo.save(failed);
    return failed;
  }

  try {
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

    const savedImages: Array<{
      imageId: string;
      filePath: string;
      provider: string;
      model: string;
    }> = [];

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
  collectionContextOutputs: Record<string, unknown>;
  styleIndex?: number;
  collectionRepo: CollectionRepository;
  designItemRepo: DesignItemRepository;
}

async function buildInputSnapshot({
  stageKey,
  targetId,
  targetType,
  approvedExecutions,
  collectionContextOutputs,
  styleIndex,
  collectionRepo,
  designItemRepo,
}: BuildInputSnapshotInput): Promise<Record<string, unknown>> {
  const snapshot: Record<string, unknown> = { stageKey, targetId };

  if (targetType === "collection") {
    const collection = await collectionRepo.findById(targetId);
    if (!collection) {
      throw new Error(`Collection not found: "${targetId}"`);
    }
    snapshot.collection = {
      id: collection.id,
      name: collection.name,
      briefing: collection.briefing,
    };
  } else {
    const designItem = await designItemRepo.findById(targetId);
    if (!designItem) {
      throw new Error(`DesignItem not found: "${targetId}"`);
    }
    snapshot.designItem = {
      id: designItem.id,
      name: designItem.name,
      collectionId: designItem.collectionId,
    };
    if (Object.keys(collectionContextOutputs).length > 0) {
      snapshot.collectionContextOutputs = collectionContextOutputs;
    }
    if (styleIndex !== undefined) {
      snapshot.styleIndex = styleIndex;
    }
  }

  const stage = stageCatalog.find((s) => s.key === stageKey);
  if (stage && stage.dependencies.length > 0) {
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
 * Strips markdown code fences (```json ... ```) that the LLM may return
 * even when instructed not to use markdown.
 */
export function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fencePattern = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/;
  const match = fencePattern.exec(trimmed);
  return match ? match[1].trim() : trimmed;
}
