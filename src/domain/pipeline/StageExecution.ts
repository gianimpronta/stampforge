export type StageExecutionStatus =
  | "running"
  | "completed"
  | "approved"
  | "rejected"
  | "failed"
  | "stale";

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
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  failureReason: string | null;
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
  readonly approvedBy: string | null;
  readonly approvedAt: Date | null;
  readonly rejectedBy: string | null;
  readonly rejectedAt: Date | null;
  readonly rejectionReason: string | null;
  readonly failureReason: string | null;

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
    this.approvedBy = props.approvedBy;
    this.approvedAt = props.approvedAt;
    this.rejectedBy = props.rejectedBy;
    this.rejectedAt = props.rejectedAt;
    this.rejectionReason = props.rejectionReason;
    this.failureReason = props.failureReason;
  }

  /**
   * Reconstitutes a StageExecution from a persistence snapshot.
   * Bypasses validation — only use when loading from a trusted data store.
   */
  static reconstruct(props: StageExecutionProps): StageExecution {
    return new StageExecution(props);
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
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      failureReason: null,
    });
  }

  /**
   * Transitions from "running" → "completed".
   * Stores the output snapshot. Represents technical success only.
   */
  complete(output: Record<string, unknown>): StageExecution {
    if (this.status !== "running") {
      throw new Error(
        `Cannot complete a StageExecution in status "${this.status}". Expected "running".`,
      );
    }

    return new StageExecution({
      ...this.toProps(),
      status: "completed",
      outputSnapshot: output,
      completedAt: new Date(),
    });
  }

  /**
   * Transitions from "completed" → "approved".
   * Represents explicit human acceptance of the output.
   */
  approve(input: { actorId: string }): StageExecution {
    if (this.status !== "completed") {
      throw new Error(
        `Cannot approve a StageExecution in status "${this.status}". Expected "completed".`,
      );
    }

    return new StageExecution({
      ...this.toProps(),
      status: "approved",
      approvedBy: input.actorId,
      approvedAt: new Date(),
    });
  }

  /**
   * Transitions from "completed" → "rejected".
   * Represents a technically valid output that a human chose not to accept.
   * This is NOT a technical failure.
   */
  reject(input: { actorId: string; reason: string }): StageExecution {
    if (this.status !== "completed") {
      throw new Error(
        `Cannot reject a StageExecution in status "${this.status}". Expected "completed".`,
      );
    }

    return new StageExecution({
      ...this.toProps(),
      status: "rejected",
      rejectedBy: input.actorId,
      rejectedAt: new Date(),
      rejectionReason: input.reason,
    });
  }

  /**
   * Transitions from "approved" → "stale".
   * Marks this execution as stale because a collectionContext dependency changed.
   * Stale executions must be re-executed before downstream stages can run.
   */
  markStale(): StageExecution {
    if (this.status !== "approved") {
      throw new Error(
        `Cannot mark a StageExecution as stale in status "${this.status}". Expected "approved".`,
      );
    }

    return new StageExecution({
      ...this.toProps(),
      status: "stale",
    });
  }

  /**
   * Transitions from "running" → "failed".
   * Represents a technical error during stage execution.
   */
  fail(error: Error): StageExecution {
    if (this.status !== "running") {
      throw new Error(
        `Cannot fail a StageExecution in status "${this.status}". Expected "running".`,
      );
    }

    return new StageExecution({
      ...this.toProps(),
      status: "failed",
      failureReason: error.message,
      completedAt: new Date(),
    });
  }

  private toProps(): StageExecutionProps {
    return {
      id: this.id,
      stageKey: this.stageKey,
      targetId: this.targetId,
      targetType: this.targetType,
      status: this.status,
      inputSnapshot: this.inputSnapshot,
      outputSnapshot: this.outputSnapshot,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      approvedBy: this.approvedBy,
      approvedAt: this.approvedAt,
      rejectedBy: this.rejectedBy,
      rejectedAt: this.rejectedAt,
      rejectionReason: this.rejectionReason,
      failureReason: this.failureReason,
    };
  }
}
