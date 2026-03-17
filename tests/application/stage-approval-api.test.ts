import { describe, expect, it } from "vitest";
import { approveStageExecution } from "../../src/application/approveStageExecution";
import { rejectStageExecution } from "../../src/application/rejectStageExecution";
import { getPipelineTimeline } from "../../src/application/getPipelineTimeline";
import { InMemoryStageExecutionRepository } from "../../src/infrastructure/db/repositories/InMemoryStageExecutionRepository";
import { StageExecution } from "../../src/domain/pipeline/StageExecution";

describe("pipeline API use cases", () => {
  it("approves a completed stage execution", async () => {
    const repo = new InMemoryStageExecutionRepository();
    const execution = StageExecution.start({
      id: "exec-1",
      stageKey: "design-concept",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    }).complete({ concept: "retro badge" });
    await repo.save(execution);

    const approved = await approveStageExecution({
      executionId: "exec-1",
      actorId: "user-1",
    }, { stageExecutionRepo: repo });

    expect(approved.status).toBe("approved");
  });

  it("rejects a completed stage execution with reason", async () => {
    const repo = new InMemoryStageExecutionRepository();
    const execution = StageExecution.start({
      id: "exec-2",
      stageKey: "design-concept",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    }).complete({ concept: "bad idea" });
    await repo.save(execution);

    const rejected = await rejectStageExecution({
      executionId: "exec-2",
      actorId: "user-1",
      reason: "Concept too generic",
    }, { stageExecutionRepo: repo });

    expect(rejected.status).toBe("rejected");
  });

  it("returns pipeline timeline for a target", async () => {
    const repo = new InMemoryStageExecutionRepository();
    const exec1 = StageExecution.start({
      id: "exec-1", stageKey: "design-concept", targetId: "item-1",
      targetType: "design_item", inputSnapshot: {},
    }).complete({ concept: "ok" });
    await repo.save(exec1);

    const timeline = await getPipelineTimeline({
      targetId: "item-1",
    }, { stageExecutionRepo: repo });

    expect(timeline.length).toBeGreaterThan(0);
  });

  it("returns timeline sorted chronologically when multiple executions exist", async () => {
    const repo = new InMemoryStageExecutionRepository();
    const now = Date.now();
    const baseProps = {
      outputSnapshot: null, completedAt: null,
      approvedBy: null, approvedAt: null,
      rejectedBy: null, rejectedAt: null,
      rejectionReason: null, failureReason: null,
    };
    const older = StageExecution.reconstruct({
      ...baseProps,
      id: "exec-old",
      stageKey: "design-concept",
      targetId: "item-2",
      targetType: "design_item",
      status: "completed",
      startedAt: new Date(now - 10000),
      inputSnapshot: {},
    });
    const newer = StageExecution.reconstruct({
      ...baseProps,
      id: "exec-new",
      stageKey: "theme-definition",
      targetId: "item-2",
      targetType: "design_item",
      status: "completed",
      startedAt: new Date(now),
      inputSnapshot: {},
    });
    await repo.save(newer);
    await repo.save(older);

    const timeline = await getPipelineTimeline({ targetId: "item-2" }, { stageExecutionRepo: repo });

    expect(timeline[0].id).toBe("exec-old");
    expect(timeline[1].id).toBe("exec-new");
  });

  it("throws when approving a non-existent execution", async () => {
    const repo = new InMemoryStageExecutionRepository();
    await expect(
      approveStageExecution({ executionId: "missing", actorId: "user-1" }, { stageExecutionRepo: repo }),
    ).rejects.toThrow('StageExecution not found: "missing"');
  });

  it("throws when rejecting a non-existent execution", async () => {
    const repo = new InMemoryStageExecutionRepository();
    await expect(
      rejectStageExecution({ executionId: "missing", actorId: "user-1", reason: "test" }, { stageExecutionRepo: repo }),
    ).rejects.toThrow('StageExecution not found: "missing"');
  });
});
