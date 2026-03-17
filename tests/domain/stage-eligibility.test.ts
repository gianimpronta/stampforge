import { describe, expect, it } from "vitest";
import { isStageReady } from "../../src/domain/pipeline/stageEligibility";

describe("isStageReady", () => {
  it("requires upstream stages to be approved", () => {
    const ready = isStageReady({
      stageKey: "master-prompt-assembly",
      approvedStageKeys: [
        "design-concept",
        "theme-definition",
        "visual-style-definition",
        "copy-generation",
      ],
    });

    expect(ready).toBe(false);
  });

  it("stage with no deps (collection-briefing) is always ready", () => {
    const ready = isStageReady({
      stageKey: "collection-briefing",
      approvedStageKeys: [],
    });

    expect(ready).toBe(true);
  });

  it("stage with all deps approved is ready", () => {
    const ready = isStageReady({
      stageKey: "master-prompt-assembly",
      approvedStageKeys: [
        "design-concept",
        "theme-definition",
        "visual-style-definition",
        "copy-generation",
        "shirt-composition-definition",
        "production-constraints-definition",
      ],
    });

    expect(ready).toBe(true);
  });

  it("stage with partial deps approved is NOT ready", () => {
    const ready = isStageReady({
      stageKey: "game-universe-extraction",
      approvedStageKeys: [],
    });

    expect(ready).toBe(false);
  });

  it("unknown stage key should throw", () => {
    expect(() =>
      isStageReady({
        stageKey: "non-existent-stage",
        approvedStageKeys: [],
      })
    ).toThrow();
  });
});
