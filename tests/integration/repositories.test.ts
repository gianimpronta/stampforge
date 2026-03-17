import { describe, expect, it } from "vitest";
import { InMemoryCollectionRepository } from "../../src/infrastructure/db/repositories/InMemoryCollectionRepository";
import { InMemoryDesignItemRepository } from "../../src/infrastructure/db/repositories/InMemoryDesignItemRepository";
import { InMemoryStageExecutionRepository } from "../../src/infrastructure/db/repositories/InMemoryStageExecutionRepository";
import { InMemoryGeneratedImageRepository } from "../../src/infrastructure/db/repositories/InMemoryGeneratedImageRepository";
import { Collection } from "../../src/domain/collections/Collection";
import { DesignItem } from "../../src/domain/design-items/DesignItem";
import { StageExecution } from "../../src/domain/pipeline/StageExecution";
import { GeneratedImage } from "../../src/domain/generation/GeneratedImage";

describe("repositories", () => {
  it("persists and reloads a stage execution snapshot", async () => {
    const repo = new InMemoryStageExecutionRepository();

    const execution = StageExecution.start({
      id: "exec-1",
      stageKey: "design-concept",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: { source: "briefing" },
    }).complete({ concept: "badge retro" });

    await repo.save(execution);

    const reloaded = await repo.findById("exec-1");

    expect(reloaded?.outputSnapshot?.concept).toBe("badge retro");
  });

  describe("CollectionRepository", () => {
    it("persists and reloads a collection", async () => {
      const repo = new InMemoryCollectionRepository();

      const collection = Collection.create({
        id: "col-1",
        name: "Coleção Retrô",
        briefing: "Designs inspirados em jogos de 8 bits",
      });

      await repo.save(collection);

      const reloaded = await repo.findById("col-1");

      expect(reloaded?.name).toBe("Coleção Retrô");
      expect(reloaded?.briefing).toBe("Designs inspirados em jogos de 8 bits");
    });

    it("returns null for unknown id", async () => {
      const repo = new InMemoryCollectionRepository();
      const result = await repo.findById("unknown");
      expect(result).toBeNull();
    });

    it("lists all collections", async () => {
      const repo = new InMemoryCollectionRepository();

      await repo.save(Collection.create({ id: "col-1", name: "A", briefing: "briefing A" }));
      await repo.save(Collection.create({ id: "col-2", name: "B", briefing: "briefing B" }));

      const all = await repo.findAll();

      expect(all).toHaveLength(2);
    });

    it("overwrites an existing collection on save", async () => {
      const repo = new InMemoryCollectionRepository();

      const original = Collection.create({ id: "col-1", name: "Original", briefing: "briefing" });
      await repo.save(original);

      const updated = Collection.create({ id: "col-1", name: "Atualizado", briefing: "briefing" });
      await repo.save(updated);

      const all = await repo.findAll();
      expect(all).toHaveLength(1);
      expect(all[0].name).toBe("Atualizado");
    });
  });

  describe("DesignItemRepository", () => {
    it("persists and reloads a design item", async () => {
      const repo = new InMemoryDesignItemRepository();

      const item = DesignItem.create({
        id: "item-1",
        collectionId: "col-1",
        name: "Camiseta Dragão",
      });

      await repo.save(item);

      const reloaded = await repo.findById("item-1");

      expect(reloaded?.name).toBe("Camiseta Dragão");
      expect(reloaded?.collectionId).toBe("col-1");
    });

    it("returns null for unknown id", async () => {
      const repo = new InMemoryDesignItemRepository();
      const result = await repo.findById("unknown");
      expect(result).toBeNull();
    });

    it("finds items by collection id", async () => {
      const repo = new InMemoryDesignItemRepository();

      await repo.save(DesignItem.create({ id: "item-1", collectionId: "col-1", name: "Item A" }));
      await repo.save(DesignItem.create({ id: "item-2", collectionId: "col-1", name: "Item B" }));
      await repo.save(DesignItem.create({ id: "item-3", collectionId: "col-2", name: "Item C" }));

      const items = await repo.findByCollectionId("col-1");

      expect(items).toHaveLength(2);
      expect(items.map((i) => i.id)).toEqual(expect.arrayContaining(["item-1", "item-2"]));
    });
  });

  describe("StageExecutionRepository", () => {
    it("returns null for unknown id", async () => {
      const repo = new InMemoryStageExecutionRepository();
      const result = await repo.findById("unknown");
      expect(result).toBeNull();
    });

    it("finds executions by target id", async () => {
      const repo = new InMemoryStageExecutionRepository();

      const exec1 = StageExecution.start({
        id: "exec-1",
        stageKey: "design-concept",
        targetId: "item-1",
        targetType: "design_item",
        inputSnapshot: {},
      });

      const exec2 = StageExecution.start({
        id: "exec-2",
        stageKey: "theme-definition",
        targetId: "item-1",
        targetType: "design_item",
        inputSnapshot: {},
      });

      const exec3 = StageExecution.start({
        id: "exec-3",
        stageKey: "design-concept",
        targetId: "item-2",
        targetType: "design_item",
        inputSnapshot: {},
      });

      await repo.save(exec1);
      await repo.save(exec2);
      await repo.save(exec3);

      const results = await repo.findByTargetId("item-1");
      expect(results).toHaveLength(2);
    });

    it("finds executions by stage key and target id", async () => {
      const repo = new InMemoryStageExecutionRepository();

      const exec1 = StageExecution.start({
        id: "exec-1",
        stageKey: "design-concept",
        targetId: "item-1",
        targetType: "design_item",
        inputSnapshot: {},
      });

      const exec2 = StageExecution.start({
        id: "exec-2",
        stageKey: "design-concept",
        targetId: "item-1",
        targetType: "design_item",
        inputSnapshot: {},
      });

      const exec3 = StageExecution.start({
        id: "exec-3",
        stageKey: "theme-definition",
        targetId: "item-1",
        targetType: "design_item",
        inputSnapshot: {},
      });

      await repo.save(exec1);
      await repo.save(exec2);
      await repo.save(exec3);

      const results = await repo.findByStageKeyAndTargetId("design-concept", "item-1");
      expect(results).toHaveLength(2);
      expect(results.every((e) => e.stageKey === "design-concept")).toBe(true);
    });
  });

  describe("GeneratedImageRepository", () => {
    it("persists and reloads a generated image", async () => {
      const repo = new InMemoryGeneratedImageRepository();

      const image = GeneratedImage.create({
        id: "img-1",
        designItemId: "item-1",
        sourceExecutionId: "exec-1",
        filePath: "/assets/img-1.png",
        promptUsed: "a retro badge",
        provider: "openai",
        model: "dall-e-3",
        metadata: { width: 1024, height: 1024 },
        status: "ready",
      });

      await repo.save(image);

      const reloaded = await repo.findById("img-1");

      expect(reloaded?.filePath).toBe("/assets/img-1.png");
      expect(reloaded?.sourceExecutionId).toBe("exec-1");
    });

    it("returns null for unknown id", async () => {
      const repo = new InMemoryGeneratedImageRepository();
      const result = await repo.findById("unknown");
      expect(result).toBeNull();
    });

    it("finds images by design item id", async () => {
      const repo = new InMemoryGeneratedImageRepository();

      await repo.save(GeneratedImage.create({
        id: "img-1",
        designItemId: "item-1",
        sourceExecutionId: "exec-1",
        filePath: "/a.png",
        promptUsed: "prompt",
        provider: "openai",
        model: "dall-e-3",
        metadata: {},
        status: "ready",
      }));

      await repo.save(GeneratedImage.create({
        id: "img-2",
        designItemId: "item-1",
        sourceExecutionId: "exec-2",
        filePath: "/b.png",
        promptUsed: "prompt",
        provider: "openai",
        model: "dall-e-3",
        metadata: {},
        status: "pending",
      }));

      await repo.save(GeneratedImage.create({
        id: "img-3",
        designItemId: "item-2",
        sourceExecutionId: "exec-3",
        filePath: "/c.png",
        promptUsed: "prompt",
        provider: "openai",
        model: "dall-e-3",
        metadata: {},
        status: "ready",
      }));

      const results = await repo.findByDesignItemId("item-1");
      expect(results).toHaveLength(2);
    });

    it("finds images by execution id", async () => {
      const repo = new InMemoryGeneratedImageRepository();

      await repo.save(GeneratedImage.create({
        id: "img-1",
        designItemId: "item-1",
        sourceExecutionId: "exec-1",
        filePath: "/a.png",
        promptUsed: "prompt",
        provider: "openai",
        model: "dall-e-3",
        metadata: {},
        status: "ready",
      }));

      await repo.save(GeneratedImage.create({
        id: "img-2",
        designItemId: "item-2",
        sourceExecutionId: "exec-1",
        filePath: "/b.png",
        promptUsed: "prompt",
        provider: "openai",
        model: "dall-e-3",
        metadata: {},
        status: "ready",
      }));

      const results = await repo.findByExecutionId("exec-1");
      expect(results).toHaveLength(2);
    });
  });
});
