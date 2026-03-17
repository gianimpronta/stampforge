import { StageExecution } from "../../../domain/pipeline/StageExecution";
import { StageExecutionRepository } from "../../../domain/pipeline/StageExecutionRepository";

export class InMemoryStageExecutionRepository implements StageExecutionRepository {
  private readonly store = new Map<string, StageExecution>();

  async save(execution: StageExecution): Promise<void> {
    this.store.set(execution.id, execution);
  }

  async findById(id: string): Promise<StageExecution | null> {
    return this.store.get(id) ?? null;
  }

  async findByTargetId(targetId: string): Promise<StageExecution[]> {
    return Array.from(this.store.values()).filter(
      (execution) => execution.targetId === targetId,
    );
  }

  async findByStageKeyAndTargetId(
    stageKey: string,
    targetId: string,
  ): Promise<StageExecution[]> {
    return Array.from(this.store.values()).filter(
      (execution) =>
        execution.stageKey === stageKey && execution.targetId === targetId,
    );
  }
}
