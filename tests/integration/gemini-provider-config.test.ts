import { describe, expect, it } from "vitest";
import { createGeminiTextProvider } from "../../src/infrastructure/providers/GeminiTextProvider";
import { createGeminiImageProvider } from "../../src/infrastructure/providers/GeminiImageProvider";
import { LocalAssetStorage } from "../../src/infrastructure/storage/LocalAssetStorage";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("Gemini provider config", () => {
  it("requires Gemini API key for text provider", () => {
    expect(() =>
      createGeminiTextProvider({ apiKey: "", model: "gemini-1.5-pro" })
    ).toThrow();
  });

  it("requires Gemini API key for image provider", () => {
    expect(() =>
      createGeminiImageProvider({ apiKey: "", model: "imagen-3.0-generate-002" })
    ).toThrow();
  });
});

describe("LocalAssetStorage", () => {
  it("saves and reads a file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "stampforge-test-"));
    const storage = new LocalAssetStorage(dir);
    const data = Buffer.from("test image data");
    const path = await storage.save("test/image.png", data, "image/png");
    const read = await storage.read(path);
    expect(read).toEqual(data);
  });

  it("getUrl returns /assets/<path>", () => {
    const storage = new LocalAssetStorage("/some/base");
    expect(storage.getUrl("test/image.png")).toBe("/assets/test/image.png");
  });

  it("exists returns false for non-existent file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "stampforge-test-"));
    const storage = new LocalAssetStorage(dir);
    const result = await storage.exists("nonexistent/file.png");
    expect(result).toBe(false);
  });

  it("exists returns true after saving a file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "stampforge-test-"));
    const storage = new LocalAssetStorage(dir);
    const data = Buffer.from("test data");
    await storage.save("check/exists.png", data, "image/png");
    const result = await storage.exists("check/exists.png");
    expect(result).toBe(true);
  });
});
