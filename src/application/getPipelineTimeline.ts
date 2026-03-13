import type { StageExecution } from "../domain/pipeline/StageExecution";
import type { StageExecutionRepository } from "../domain/pipeline/StageExecutionRepository";

export interface GetPipelineTimelineInput {
  targetId: string;
}

export interface GetPipelineTimelineDeps {
  stageExecutionRepo: StageExecutionRepository;
}

/**
 * Retorna todas as execuções de estágio associadas a um alvo (targetId),
 * em ordem cronológica de início.
 */
export async function getPipelineTimeline(
  input: GetPipelineTimelineInput,
  deps: GetPipelineTimelineDeps,
): Promise<StageExecution[]> {
  const { targetId } = input;
  const { stageExecutionRepo } = deps;

  const executions = await stageExecutionRepo.findByTargetId(targetId);
  return executions.sort(
    (a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
  );
}
