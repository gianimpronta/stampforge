import { describe, expect, it } from "vitest";
import { InMemoryGeneratedImageRepository } from "../../src/infrastructure/db/repositories/InMemoryGeneratedImageRepository";
import { GeneratedImage } from "../../src/domain/generation/GeneratedImage";

describe("image traceability", () => {
  it("returns an image with its source execution metadata", async () => {
    const repo = new InMemoryGeneratedImageRepository();
    const image = GeneratedImage.create({
      id: "img-1",
      designItemId: "item-1",
      sourceExecutionId: "exec-visual-1",
      filePath: "items/item-1/variations/v1.png",
      promptUsed: "retro board game badge",
      provider: "gemini",
      model: "imagen-3.0",
      metadata: {},
      status: "ready",
    });
    await repo.save(image);

    const found = await repo.findById("img-1");
    expect(found?.sourceExecutionId).toBe("exec-visual-1");
    expect(found?.promptUsed).toBe("retro board game badge");
  });

  it("lists images by design item", async () => {
    const repo = new InMemoryGeneratedImageRepository();
    const img1 = GeneratedImage.create({
      id: "img-1", designItemId: "item-1", sourceExecutionId: "exec-1",
      filePath: "v1.png", promptUsed: "prompt1", provider: "gemini", model: "imagen-3.0", metadata: {}, status: "ready",
    });
    const img2 = GeneratedImage.create({
      id: "img-2", designItemId: "item-1", sourceExecutionId: "exec-1",
      filePath: "v2.png", promptUsed: "prompt1", provider: "gemini", model: "imagen-3.0", metadata: {}, status: "ready",
    });
    await repo.save(img1);
    await repo.save(img2);

    const images = await repo.findByDesignItemId("item-1");
    expect(images.length).toBe(2);
  });

  it("generateVisualVariations saves images with correct traceability", async () => {
    const { generateVisualVariations } = await import("../../src/application/generateVisualVariations");
    const repo = new InMemoryGeneratedImageRepository();

    const fakeImageProvider = {
      async generateImages() {
        return {
          images: [
            { data: Buffer.from("img-data"), mimeType: "image/png" },
          ],
          provider: "gemini",
          model: "imagen-3.0",
        };
      },
    };

    const fakeStorage = {
      async save(path: string) {
        return path;
      },
      async read() { return Buffer.from(""); },
      getUrl(path: string) { return `/files/${path}`; },
      async exists() { return false; },
    };

    await generateVisualVariations(
      {
        designItemId: "item-42",
        executionId: "exec-visual-99",
        prompt: "retro board game shield",
        count: 1,
      },
      {
        generatedImageRepo: repo,
        imageProvider: fakeImageProvider,
        storage: fakeStorage,
      },
    );

    const images = await repo.findByDesignItemId("item-42");
    expect(images.length).toBe(1);
    expect(images[0].sourceExecutionId).toBe("exec-visual-99");
    expect(images[0].provider).toBe("gemini");
    expect(images[0].model).toBe("imagen-3.0");
    expect(images[0].promptUsed).toBe("retro board game shield");
  });

  it("generateVisualVariations uses 'png' as fallback extension when mimeType has no slash", async () => {
    const { generateVisualVariations } = await import("../../src/application/generateVisualVariations");
    const repo = new InMemoryGeneratedImageRepository();

    const fakeImageProvider = {
      async generateImages() {
        return {
          images: [{ data: Buffer.from("img-data"), mimeType: "png" }],
          provider: "stub",
          model: "stub-1",
        };
      },
    };
    const savedPaths: string[] = [];
    const fakeStorage = {
      async save(path: string) { savedPaths.push(path); return path; },
      async read() { return Buffer.from(""); },
      getUrl(path: string) { return `/files/${path}`; },
      async exists() { return false; },
    };

    await generateVisualVariations(
      { designItemId: "item-ext", executionId: "exec-ext", prompt: "test", count: 1 },
      { generatedImageRepo: repo, imageProvider: fakeImageProvider, storage: fakeStorage },
    );

    expect(savedPaths[0]).toMatch(/\.png$/);
  });

  it("listGeneratedImages returns images for design item", async () => {
    const { listGeneratedImages } = await import("../../src/application/listGeneratedImages");
    const repo = new InMemoryGeneratedImageRepository();

    const img = GeneratedImage.create({
      id: "img-99",
      designItemId: "item-7",
      sourceExecutionId: "exec-1",
      filePath: "v1.png",
      promptUsed: "prompt",
      provider: "gemini",
      model: "imagen-3.0",
      metadata: {},
      status: "ready",
    });
    await repo.save(img);

    const result = await listGeneratedImages({ designItemId: "item-7" }, { generatedImageRepo: repo });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("img-99");
  });
});
