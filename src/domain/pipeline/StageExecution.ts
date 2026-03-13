export type StageExecutionStatus = "running" | "completed" | "approved" | "rejected";

export type StageTargetType = "collection" | "design_item";

export interface StageExecutionProps {
  id: string;
  stageKey: string;
  targetId: string;
  targetType: StageTargetType;
  status: StageExecutionStatus;
  inputSnapshot: Record<string, unknown>;
  outputSnapshot: Record<string, unknown> | null;
  startedAt: Date;
  completedAt: Date | null;
}

export interface StartStageExecutionInput {
  id: string;
  stageKey: string;
  targetId: string;
  targetType: StageTargetType;
  inputSnapshot: Record<string, unknown>;
}

/**
 * StageExecution is a HISTORICAL RECORD of running a stage.
 * It captures when a stage was run, what input was used, what output was
 * produced, and whether the result was approved or rejected by a human.
 */
export class StageExecution {
  readonly id: string;
  readonly stageKey: string;
  readonly targetId: string;
  readonly targetType: StageTargetType;
  readonly status: StageExecutionStatus;
  readonly inputSnapshot: Record<string, unknown>;
  readonly outputSnapshot: Record<string, unknown> | null;
  readonly startedAt: Date;
  readonly completedAt: Date | null;

  private constructor(props: StageExecutionProps) {
    this.id = props.id;
    this.stageKey = props.stageKey;
    this.targetId = props.targetId;
    this.targetType = props.targetType;
    this.status = props.status;
    this.inputSnapshot = props.inputSnapshot;
    this.outputSnapshot = props.outputSnapshot;
    this.startedAt = props.startedAt;
    this.completedAt = props.completedAt;
  }

  /**
   * Creates a new execution record for a stage.
   * Status begins as "running" — it is not yet complete, approved, or rejected.
   */
  static start(input: StartStageExecutionInput): StageExecution {
    if (!input.id || input.id.trim() === "") {
      throw new Error("StageExecution id is required");
    }
    if (!input.stageKey || input.stageKey.trim() === "") {
      throw new Error("StageExecution stageKey is required");
    }
    if (!input.targetId || input.targetId.trim() === "") {
      throw new Error("StageExecution targetId is required");
    }

    return new StageExecution({
      id: input.id,
      stageKey: input.stageKey,
      targetId: input.targetId,
      targetType: input.targetType,
      status: "running",
      inputSnapshot: input.inputSnapshot,
      outputSnapshot: null,
      startedAt: new Date(),
      completedAt: null,
    });
  }
}
