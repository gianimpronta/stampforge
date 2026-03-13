import { randomUUID } from "crypto";
import { StageExecution } from "../domain/pipeline/StageExecution";
import type { StageTargetType } from "../domain/pipeline/StageExecution";
import type { StageExecutionRepository } from "../domain/pipeline/StageExecutionRepository";
import type { CollectionRepository } from "../domain/collections/CollectionRepository";
import type { DesignItemRepository } from "../domain/design-items/DesignItemRepository";
import type { LLMProvider } from "../domain/providers/LLMProvider";
import { stageCatalog } from "../domain/pipeline/stageCatalog";
import { isStageReady } from "../domain/pipeline/stageEligibility";

export interface RunStageExecutionDeps {
  executionRepo: StageExecutionRepository;
  collectionRepo: CollectionRepository;
  designItemRepo: DesignItemRepository;
  llm: LLMProvider;
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
  const allExecutions = await executionRepo.findByTargetId(targetId);
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

  // 7. Chama o LLM e transiciona para "completed" ou "failed"
  try {
    const prompt = buildPrompt({ stageKey, inputSnapshot });
    const response = await llm.generateText({ prompt });

    const completed = execution.complete({
      content: response.content,
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

  // Inclui dados do alvo
  if (targetType === "collection") {
    const collection = await collectionRepo.findById(targetId);
    if (collection) {
      snapshot.collection = {
        id: collection.id,
        name: collection.name,
        briefing: collection.briefing,
      };
    }
  } else {
    const designItem = await designItemRepo.findById(targetId);
    if (designItem) {
      snapshot.designItem = {
        id: designItem.id,
        name: designItem.name,
        collectionId: designItem.collectionId,
      };
    }
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

function buildPrompt(input: {
  stageKey: string;
  inputSnapshot: Record<string, unknown>;
}): string {
  return (
    `Você é um assistente especializado em criação de designs de camisetas temáticas.\n` +
    `Estágio atual do pipeline: ${input.stageKey}\n\n` +
    `Contexto de entrada:\n${JSON.stringify(input.inputSnapshot, null, 2)}\n\n` +
    `Execute o estágio "${input.stageKey}" com base no contexto acima e retorne o resultado em formato JSON.`
  );
}
