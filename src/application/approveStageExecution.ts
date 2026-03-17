import type { StageExecution } from "../domain/pipeline/StageExecution";
import type { StageExecutionRepository } from "../domain/pipeline/StageExecutionRepository";

export interface ApproveStageExecutionInput {
  executionId: string;
  actorId: string;
}

export interface ApproveStageExecutionDeps {
  stageExecutionRepo: StageExecutionRepository;
}

/**
 * Carrega uma execução de estágio e a marca como aprovada pelo ator informado.
 * Requer que a execução esteja no status "completed".
 */
export async function approveStageExecution(
  input: ApproveStageExecutionInput,
  deps: ApproveStageExecutionDeps,
): Promise<StageExecution> {
  const { executionId, actorId } = input;
  const { stageExecutionRepo } = deps;

  const execution = await stageExecutionRepo.findById(executionId);
  if (!execution) {
    throw new Error(`StageExecution not found: "${executionId}"`);
  }

  const approved = execution.approve({ actorId });
  await stageExecutionRepo.save(approved);
  return approved;
}
