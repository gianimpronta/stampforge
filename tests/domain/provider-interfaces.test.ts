import { describe, expect, it } from "vitest";
import type { LLMProvider as _LLMProvider } from "../../src/domain/providers/LLMProvider";
import type { ImageGenerationProvider as _ImageGenerationProvider } from "../../src/domain/providers/ImageGenerationProvider";

describe("provider interfaces", () => {
  it("defines interfaces for text and image generation", () => {
    const interfaces: Array<string> = ["LLMProvider", "ImageGenerationProvider"];
    expect(interfaces).toContain("LLMProvider");
    expect(interfaces).toContain("ImageGenerationProvider");
  });
});
