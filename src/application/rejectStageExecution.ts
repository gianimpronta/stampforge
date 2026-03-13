import type { StageExecution } from "../domain/pipeline/StageExecution";
import type { StageExecutionRepository } from "../domain/pipeline/StageExecutionRepository";

export interface RejectStageExecutionInput {
  executionId: string;
  actorId: string;
  reason: string;
}

export interface RejectStageExecutionDeps {
  stageExecutionRepo: StageExecutionRepository;
}

/**
 * Carrega uma execução de estágio e a marca como rejeitada pelo ator informado.
 * Requer que a execução esteja no status "completed".
 * Rejeição representa desacordo humano com o output, não falha técnica.
 */
export async function rejectStageExecution(
  input: RejectStageExecutionInput,
  deps: RejectStageExecutionDeps,
): Promise<StageExecution> {
  const { executionId, actorId, reason } = input;
  const { stageExecutionRepo } = deps;

  const execution = await stageExecutionRepo.findById(executionId);
  if (!execution) {
    throw new Error(`StageExecution not found: "${executionId}"`);
  }

  const rejected = execution.reject({ actorId, reason });
  await stageExecutionRepo.save(rejected);
  return rejected;
}
