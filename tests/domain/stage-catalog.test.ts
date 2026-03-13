import { describe, expect, it } from "vitest";
import { stageCatalog } from "../../src/domain/pipeline/stageCatalog";

describe("stageCatalog", () => {
  it("defines the official V1 pipeline in order", () => {
    expect(stageCatalog.map((stage) => stage.key)).toEqual([
      "collection-briefing",
      "game-selection",
      "game-universe-extraction",
      "design-concept",
      "theme-definition",
      "visual-style-definition",
      "copy-generation",
      "shirt-composition-definition",
      "production-constraints-definition",
      "master-prompt-assembly",
      "visual-variation-generation",
    ]);
  });
});
