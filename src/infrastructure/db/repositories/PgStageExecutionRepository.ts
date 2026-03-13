import { Pool } from "pg";
import { StageExecution, StageExecutionStatus, StageTargetType } from "../../../domain/pipeline/StageExecution";
import { StageExecutionRepository } from "../../../domain/pipeline/StageExecutionRepository";

export class PgStageExecutionRepository implements StageExecutionRepository {
  constructor(private readonly pool: Pool) {}

  async save(execution: StageExecution): Promise<void> {
    await this.pool.query(
      `INSERT INTO stage_executions (
         id, stage_key, target_id, target_type, status,
         input_snapshot, output_snapshot,
         approved_by, approved_at,
         rejected_by, rejected_at, rejection_reason,
         failure_reason, started_at, completed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE
         SET status = EXCLUDED.status,
             output_snapshot = EXCLUDED.output_snapshot,
             approved_by = EXCLUDED.approved_by,
             approved_at = EXCLUDED.approved_at,
             rejected_by = EXCLUDED.rejected_by,
             rejected_at = EXCLUDED.rejected_at,
             rejection_reason = EXCLUDED.rejection_reason,
             failure_reason = EXCLUDED.failure_reason,
             completed_at = EXCLUDED.completed_at,
             updated_at = now()`,
      [
        execution.id,
        execution.stageKey,
        execution.targetId,
        execution.targetType,
        execution.status,
        JSON.stringify(execution.inputSnapshot),
        execution.outputSnapshot ? JSON.stringify(execution.outputSnapshot) : null,
        execution.approvedBy,
        execution.approvedAt,
        execution.rejectedBy,
        execution.rejectedAt,
        execution.rejectionReason,
        execution.failureReason,
        execution.startedAt,
        execution.completedAt,
      ],
    );
  }

  async findById(id: string): Promise<StageExecution | null> {
    const result = await this.pool.query(
      "SELECT * FROM stage_executions WHERE id = $1",
      [id],
    );

    if (result.rows.length === 0) return null;

    return this.rowToStageExecution(result.rows[0]);
  }

  async findByTargetId(targetId: string): Promise<StageExecution[]> {
    const result = await this.pool.query(
      "SELECT * FROM stage_executions WHERE target_id = $1 ORDER BY started_at ASC",
      [targetId],
    );

    return result.rows.map((row) => this.rowToStageExecution(row));
  }

  async findByStageKeyAndTargetId(
    stageKey: string,
    targetId: string,
  ): Promise<StageExecution[]> {
    const result = await this.pool.query(
      "SELECT * FROM stage_executions WHERE stage_key = $1 AND target_id = $2 ORDER BY started_at ASC",
      [stageKey, targetId],
    );

    return result.rows.map((row) => this.rowToStageExecution(row));
  }

  private rowToStageExecution(row: Record<string, unknown>): StageExecution {
    return StageExecution.reconstruct({
      id: row.id as string,
      stageKey: row.stage_key as string,
      targetId: row.target_id as string,
      targetType: row.target_type as StageTargetType,
      status: row.status as StageExecutionStatus,
      inputSnapshot: row.input_snapshot as Record<string, unknown>,
      outputSnapshot: row.output_snapshot as Record<string, unknown> | null,
      approvedBy: row.approved_by as string | null,
      approvedAt: row.approved_at as Date | null,
      rejectedBy: row.rejected_by as string | null,
      rejectedAt: row.rejected_at as Date | null,
      rejectionReason: row.rejection_reason as string | null,
      failureReason: row.failure_reason as string | null,
      startedAt: row.started_at as Date,
      completedAt: row.completed_at as Date | null,
    });
  }
}
