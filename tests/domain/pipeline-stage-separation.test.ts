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
});
