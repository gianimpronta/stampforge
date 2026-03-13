import { describe, expect, it } from "vitest";
import type { LLMProvider } from "../../src/domain/providers/LLMProvider";
import type { ImageGenerationProvider } from "../../src/domain/providers/ImageGenerationProvider";

describe("provider interfaces", () => {
  it("defines interfaces for text and image generation", () => {
    const interfaces: Array<string> = ["LLMProvider", "ImageGenerationProvider"];
    expect(interfaces).toContain("LLMProvider");
    expect(interfaces).toContain("ImageGenerationProvider");
  });
});
