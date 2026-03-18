import { describe, expect, it } from "vitest";
import { stageCatalog } from "../../src/domain/pipeline/stageCatalog";

describe("stageCatalog", () => {
  it("defines the official V1 pipeline (6 stages) in order", () => {
    expect(stageCatalog.map((stage) => stage.key)).toEqual([
      "collection-briefing",
      "game-universe-extraction",
      "visual-style-definition",
      "composition-definition",
      "master-prompt-assembly",
      "visual-variation-generation",
    ]);
  });

  it("first 3 stages are collection scope", () => {
    const collectionStages = stageCatalog.filter(
      (s) => s.scope === "collection",
    );
    expect(collectionStages.map((s) => s.key)).toEqual([
      "collection-briefing",
      "game-universe-extraction",
      "visual-style-definition",
    ]);
  });

  it("last 3 stages are design_item scope", () => {
    const itemStages = stageCatalog.filter((s) => s.scope === "design_item");
    expect(itemStages.map((s) => s.key)).toEqual([
      "composition-definition",
      "master-prompt-assembly",
      "visual-variation-generation",
    ]);
  });

  it("composition-definition has collectionDependencies on all 3 collection stages", () => {
    const stage = stageCatalog.find((s) => s.key === "composition-definition");
    expect(stage?.collectionDependencies).toEqual([
      "collection-briefing",
      "game-universe-extraction",
      "visual-style-definition",
    ]);
  });

  it("collection stages have no collectionDependencies", () => {
    for (const stage of stageCatalog.filter((s) => s.scope === "collection")) {
      expect(stage.collectionDependencies).toEqual([]);
    }
  });
});
