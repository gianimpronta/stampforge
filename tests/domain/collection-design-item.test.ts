import { describe, expect, it } from "vitest";
import { Collection } from "../../src/domain/collections/Collection";
import { DesignItem } from "../../src/domain/design-items/DesignItem";
import { GeneratedImage } from "../../src/domain/generation/GeneratedImage";
import { PipelineStage } from "../../src/domain/pipeline/PipelineStage";

describe("Collection and DesignItem", () => {
  it("creates a design item linked to a collection", () => {
    const collection = Collection.create({
      id: "col-1",
      name: "Board Games",
      briefing: "Premium boardgame collection",
    });

    const item = DesignItem.create({
      id: "item-1",
      collectionId: collection.id,
      name: "Ark Nova badge",
    });

    expect(item.collectionId).toBe(collection.id);
  });

  it("Collection.create lança erro para id vazio", () => {
    expect(() =>
      Collection.create({ id: "", name: "Test", briefing: "Brief" }),
    ).toThrow("id is required");
  });

  it("Collection.create lança erro para name vazio", () => {
    expect(() =>
      Collection.create({ id: "c1", name: "", briefing: "Brief" }),
    ).toThrow("name is required");
  });

  it("Collection.create lança erro para briefing vazio", () => {
    expect(() =>
      Collection.create({ id: "c1", name: "Test", briefing: "" }),
    ).toThrow("briefing is required");
  });

  it("Collection.reconstruct bypassa validação", () => {
    const col = Collection.reconstruct({
      id: "c1",
      name: "Test",
      briefing: "Brief",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(col.id).toBe("c1");
  });

  it("DesignItem.create lança erro para id vazio", () => {
    expect(() =>
      DesignItem.create({ id: "", collectionId: "col-1", name: "Name" }),
    ).toThrow("id is required");
  });

  it("DesignItem.create lança erro para collectionId vazio", () => {
    expect(() =>
      DesignItem.create({ id: "d1", collectionId: "", name: "Name" }),
    ).toThrow("collectionId is required");
  });

  it("DesignItem.create lança erro para name vazio", () => {
    expect(() =>
      DesignItem.create({ id: "d1", collectionId: "col-1", name: "" }),
    ).toThrow("name is required");
  });

  it("DesignItem.reconstruct bypassa validação", () => {
    const item = DesignItem.reconstruct({
      id: "d1",
      collectionId: "col-1",
      name: "Test",
      collectionContext: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(item.id).toBe("d1");
  });
});

describe("GeneratedImage", () => {
  const validInput = {
    id: "img-1",
    designItemId: "d1",
    sourceExecutionId: "exec-1",
    filePath: "images/test.png",
    promptUsed: "a pixel art warrior",
    provider: "pollinations",
    model: "flux",
    metadata: {},
    status: "ready" as const,
  };

  it("cria uma imagem válida", () => {
    const img = GeneratedImage.create(validInput);
    expect(img.id).toBe("img-1");
    expect(img.sourceExecutionId).toBe("exec-1");
  });

  it("reconstruct bypassa validação", () => {
    const img = GeneratedImage.reconstruct({ ...validInput, createdAt: new Date() });
    expect(img.id).toBe("img-1");
  });

  it("lança erro para id vazio", () => {
    expect(() => GeneratedImage.create({ ...validInput, id: "" })).toThrow("id is required");
  });

  it("lança erro para designItemId vazio", () => {
    expect(() => GeneratedImage.create({ ...validInput, designItemId: "" })).toThrow(
      "designItemId is required",
    );
  });

  it("lança erro para sourceExecutionId vazio", () => {
    expect(() =>
      GeneratedImage.create({ ...validInput, sourceExecutionId: "" }),
    ).toThrow("sourceExecutionId is required");
  });

  it("lança erro para filePath vazio", () => {
    expect(() => GeneratedImage.create({ ...validInput, filePath: "" })).toThrow(
      "filePath is required",
    );
  });

  it("lança erro para promptUsed vazio", () => {
    expect(() => GeneratedImage.create({ ...validInput, promptUsed: "" })).toThrow(
      "promptUsed is required",
    );
  });

  it("lança erro para provider vazio", () => {
    expect(() => GeneratedImage.create({ ...validInput, provider: "" })).toThrow(
      "provider is required",
    );
  });

  it("lança erro para model vazio", () => {
    expect(() => GeneratedImage.create({ ...validInput, model: "" })).toThrow(
      "model is required",
    );
  });
});

describe("PipelineStage", () => {
  it("cria um estágio válido", () => {
    const stage = PipelineStage.create({
      key: "test-stage",
      name: "Test Stage",
      scope: "collection",
      order: 1,
    });
    expect(stage.key).toBe("test-stage");
  });

  it("lança erro para key vazia", () => {
    expect(() =>
      PipelineStage.create({ key: "", name: "Test", scope: "collection", order: 1 }),
    ).toThrow("key is required");
  });

  it("lança erro para name vazio", () => {
    expect(() =>
      PipelineStage.create({ key: "k", name: "", scope: "collection", order: 1 }),
    ).toThrow("name is required");
  });

  it("lança erro para order menor que 1", () => {
    expect(() =>
      PipelineStage.create({ key: "k", name: "Test", scope: "collection", order: 0 }),
    ).toThrow("order must be a positive integer");
  });
});
