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
});
