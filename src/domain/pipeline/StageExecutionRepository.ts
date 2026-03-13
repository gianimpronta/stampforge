import { StageExecution } from "./StageExecution";

export interface StageExecutionRepository {
  save(execution: StageExecution): Promise<void>;
  findById(id: string): Promise<StageExecution | null>;
  findByTargetId(targetId: string): Promise<StageExecution[]>;
  findByStageKeyAndTargetId(stageKey: string, targetId: string): Promise<StageExecution[]>;
}
