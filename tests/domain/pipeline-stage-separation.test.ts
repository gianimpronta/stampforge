import { describe, expect, it } from "vitest";
import { PipelineStage } from "../../src/domain/pipeline/PipelineStage";
import { StageExecution } from "../../src/domain/pipeline/StageExecution";

describe("PipelineStage and StageExecution", () => {
  it("keeps stage definition separate from execution history", () => {
    const stage = PipelineStage.create({
      key: "define-style",
      name: "Definicao de estilo visual",
      scope: "design_item",
      order: 6,
    });

    const execution = StageExecution.start({
      id: "exec-1",
      stageKey: stage.key,
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    });

    expect(execution.stageKey).toBe(stage.key);
    expect(stage.order).toBe(6);
  });

  it("reconstruct restores a StageExecution from a snapshot", () => {
    const startedAt = new Date("2026-01-01T00:00:00Z");
    const execution = StageExecution.reconstruct({
      id: "exec-restored",
      stageKey: "design-concept",
      targetId: "item-99",
      targetType: "design_item",
      status: "approved",
      startedAt,
      inputSnapshot: { some: "data" },
    });

    expect(execution.id).toBe("exec-restored");
    expect(execution.status).toBe("approved");
    expect(execution.startedAt).toEqual(startedAt);
  });

  it("throws when starting with empty id", () => {
    expect(() =>
      StageExecution.start({ id: "", stageKey: "s", targetId: "t", targetType: "design_item", inputSnapshot: {} }),
    ).toThrow("StageExecution id is required");
  });

  it("throws when starting with empty stageKey", () => {
    expect(() =>
      StageExecution.start({ id: "e-1", stageKey: "", targetId: "t", targetType: "design_item", inputSnapshot: {} }),
    ).toThrow("StageExecution stageKey is required");
  });

  it("throws when starting with empty targetId", () => {
    expect(() =>
      StageExecution.start({ id: "e-1", stageKey: "s", targetId: "", targetType: "design_item", inputSnapshot: {} }),
    ).toThrow("StageExecution targetId is required");
  });
});
