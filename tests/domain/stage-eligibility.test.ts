import { describe, expect, it } from "vitest";
import { isStageReady } from "../../src/domain/pipeline/stageEligibility";

describe("isStageReady", () => {
  describe("collection stages", () => {
    it("collection-briefing (no deps) is always ready", () => {
      expect(isStageReady({ stageKey: "collection-briefing", approvedStageKeys: [] })).toBe(true);
    });

    it("game-universe-extraction requires collection-briefing approved", () => {
      expect(
        isStageReady({
          stageKey: "game-universe-extraction",
          approvedStageKeys: [],
        }),
      ).toBe(false);

      expect(
        isStageReady({
          stageKey: "game-universe-extraction",
          approvedStageKeys: ["collection-briefing"],
        }),
      ).toBe(true);
    });

    it("visual-style-definition requires game-universe-extraction approved", () => {
      expect(
        isStageReady({
          stageKey: "visual-style-definition",
          approvedStageKeys: ["collection-briefing"],
        }),
      ).toBe(false);

      expect(
        isStageReady({
          stageKey: "visual-style-definition",
          approvedStageKeys: ["collection-briefing", "game-universe-extraction"],
        }),
      ).toBe(true);
    });
  });

  describe("design_item stages — cross-scope collectionContext", () => {
    const approvedCollectionIds = new Set(["exec-briefing", "exec-universe", "exec-style"]);
    const fullContext = {
      "collection-briefing": { executionId: "exec-briefing" },
      "game-universe-extraction": { executionId: "exec-universe" },
      "visual-style-definition": { executionId: "exec-style", styleIndex: 1 },
    };

    it("composition-definition ready when all 3 collection deps satisfied", () => {
      expect(
        isStageReady({
          stageKey: "composition-definition",
          approvedStageKeys: [],
          collectionContext: fullContext,
          approvedCollectionExecutionIds: approvedCollectionIds,
        }),
      ).toBe(true);
    });

    it("composition-definition fails if collectionContext is missing an entry", () => {
      const partialContext = {
        "collection-briefing": { executionId: "exec-briefing" },
        "game-universe-extraction": { executionId: "exec-universe" },
      };
      expect(
        isStageReady({
          stageKey: "composition-definition",
          approvedStageKeys: [],
          collectionContext: partialContext,
          approvedCollectionExecutionIds: approvedCollectionIds,
        }),
      ).toBe(false);
    });

    it("composition-definition fails if referenced execution is not approved", () => {
      const partialApproved = new Set(["exec-briefing", "exec-universe"]);
      expect(
        isStageReady({
          stageKey: "composition-definition",
          approvedStageKeys: [],
          collectionContext: fullContext,
          approvedCollectionExecutionIds: partialApproved,
        }),
      ).toBe(false);
    });

    it("composition-definition fails with empty collectionContext", () => {
      expect(
        isStageReady({
          stageKey: "composition-definition",
          approvedStageKeys: [],
          collectionContext: {},
          approvedCollectionExecutionIds: approvedCollectionIds,
        }),
      ).toBe(false);
    });

    it("master-prompt-assembly requires composition-definition approved (no collectionDeps)", () => {
      expect(
        isStageReady({
          stageKey: "master-prompt-assembly",
          approvedStageKeys: [],
        }),
      ).toBe(false);

      expect(
        isStageReady({
          stageKey: "master-prompt-assembly",
          approvedStageKeys: ["composition-definition"],
        }),
      ).toBe(true);
    });

    it("visual-variation-generation requires master-prompt-assembly approved", () => {
      expect(
        isStageReady({
          stageKey: "visual-variation-generation",
          approvedStageKeys: ["composition-definition"],
        }),
      ).toBe(false);

      expect(
        isStageReady({
          stageKey: "visual-variation-generation",
          approvedStageKeys: ["composition-definition", "master-prompt-assembly"],
        }),
      ).toBe(true);
    });
  });

  it("unknown stage key throws", () => {
    expect(() =>
      isStageReady({ stageKey: "non-existent-stage", approvedStageKeys: [] }),
    ).toThrow();
  });
});
