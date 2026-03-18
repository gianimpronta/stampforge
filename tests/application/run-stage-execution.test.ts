import { describe, expect, it } from "vitest";
import { runStageExecution, stripCodeFences } from "../../src/application/runStageExecution";
import { InMemoryStageExecutionRepository } from "../../src/infrastructure/db/repositories/InMemoryStageExecutionRepository";
import { InMemoryCollectionRepository } from "../../src/infrastructure/db/repositories/InMemoryCollectionRepository";
import { InMemoryDesignItemRepository } from "../../src/infrastructure/db/repositories/InMemoryDesignItemRepository";
import { InMemoryGeneratedImageRepository } from "../../src/infrastructure/db/repositories/InMemoryGeneratedImageRepository";
import { Collection } from "../../src/domain/collections/Collection";
import { DesignItem } from "../../src/domain/design-items/DesignItem";
import { StageExecution } from "../../src/domain/pipeline/StageExecution";
import type { LLMProvider, LLMResponse } from "../../src/domain/providers/LLMProvider";
import type { ImageGenerationProvider, ImageGenerationResponse } from "../../src/domain/providers/ImageGenerationProvider";
import type { AssetStorage } from "../../src/domain/providers/AssetStorage";

function makeFakeLLMProvider(response: string): LLMProvider {
  return {
    async generateText(): Promise<LLMResponse> {
      return {
        content: response,
        provider: "fake",
        model: "fake-model",
        usage: { inputTokens: 10, outputTokens: 20 },
      };
    },
  };
}

async function makeApprovedCollectionExecs(
  executionRepo: InMemoryStageExecutionRepository,
  collectionId: string,
) {
  const collectionStages = [
    "collection-briefing",
    "game-universe-extraction",
    "visual-style-definition",
  ];
  const ids: Record<string, string> = {};
  for (const key of collectionStages) {
    const id = `exec-col-${key}`;
    ids[key] = id;
    const exec = StageExecution.start({
      id,
      stageKey: key,
      targetId: collectionId,
      targetType: "collection",
      inputSnapshot: {},
    })
      .complete({ content: `{"result":"${key}"}` })
      .approve({ actorId: "system" });
    await executionRepo.save(exec);
  }
  return ids;
}

describe("runStageExecution", () => {
  it("cria uma execução, chama o handler do estágio e salva o resultado", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const llm = makeFakeLLMProvider("Briefing da coleção foi processado com sucesso.");

    const collection = Collection.create({
      id: "col-1",
      name: "Coleção Zelda",
      briefing: "Uma coleção inspirada no universo de Zelda.",
    });
    await collectionRepo.save(collection);

    const result = await runStageExecution({
      stageKey: "collection-briefing",
      targetId: "col-1",
      deps: {
        executionRepo,
        collectionRepo,
        designItemRepo,
        llm,
      },
    });

    expect(result.status).toBe("completed");
    expect(result.stageKey).toBe("collection-briefing");
    expect(result.targetId).toBe("col-1");
    expect(result.outputSnapshot).not.toBeNull();
    expect(result.outputSnapshot).toHaveProperty("content");
    expect(result.completedAt).not.toBeNull();

    const saved = await executionRepo.findById(result.id);
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe("completed");
  });

  it("rejeita se o estágio não existe no catálogo", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const llm = makeFakeLLMProvider("qualquer coisa");

    await expect(
      runStageExecution({
        stageKey: "estagio-inexistente",
        targetId: "col-1",
        deps: { executionRepo, collectionRepo, designItemRepo, llm },
      })
    ).rejects.toThrow('Stage not found in catalog: "estagio-inexistente"');
  });

  it("rejeita se as dependências upstream não estão aprovadas", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const llm = makeFakeLLMProvider("qualquer");

    const collection = Collection.create({
      id: "col-2",
      name: "Coleção Mario",
      briefing: "Uma coleção inspirada no universo de Mario.",
    });
    await collectionRepo.save(collection);

    // game-universe-extraction depende de collection-briefing aprovado
    await expect(
      runStageExecution({
        stageKey: "game-universe-extraction",
        targetId: "col-2",
        deps: { executionRepo, collectionRepo, designItemRepo, llm },
      })
    ).rejects.toThrow(/not eligible/i);
  });

  it("marca como failed quando o LLM lança um erro", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const failingLLM: LLMProvider = {
      async generateText() {
        throw new Error("LLM indisponível");
      },
    };

    const collection = Collection.create({
      id: "col-3",
      name: "Coleção Dark Souls",
      briefing: "Uma coleção sombria.",
    });
    await collectionRepo.save(collection);

    const result = await runStageExecution({
      stageKey: "collection-briefing",
      targetId: "col-3",
      deps: {
        executionRepo,
        collectionRepo,
        designItemRepo,
        llm: failingLLM,
      },
    });

    expect(result.status).toBe("failed");
    expect(result.failureReason).toBe("LLM indisponível");

    const saved = await executionRepo.findById(result.id);
    expect(saved!.status).toBe("failed");
  });

  it("envia systemPrompt específico do estágio ao LLM", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();

    let capturedSystemPrompt = "";
    const llm: LLMProvider = {
      async generateText(req): Promise<LLMResponse> {
        capturedSystemPrompt = req.systemPrompt ?? "";
        return { content: "resultado", provider: "fake", model: "fake-model" };
      },
    };

    const collection = Collection.create({
      id: "col-5",
      name: "Coleção Sonic",
      briefing: "Camisetas com tema Sonic.",
    });
    await collectionRepo.save(collection);

    await runStageExecution({
      stageKey: "collection-briefing",
      targetId: "col-5",
      deps: { executionRepo, collectionRepo, designItemRepo, llm },
    });

    expect(capturedSystemPrompt).toContain("collection-briefing");
    expect(capturedSystemPrompt).toContain("JSON");
  });

  it("prompt do collection-briefing contém dados da coleção", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();

    let capturedPrompt = "";
    const llm: LLMProvider = {
      async generateText(req): Promise<LLMResponse> {
        capturedPrompt = req.prompt;
        return { content: "resultado", provider: "fake", model: "fake-model" };
      },
    };

    const collection = Collection.create({
      id: "col-6",
      name: "Mega Man Mania",
      briefing: "Coleção retrô de Mega Man com pixel art.",
    });
    await collectionRepo.save(collection);

    await runStageExecution({
      stageKey: "collection-briefing",
      targetId: "col-6",
      deps: { executionRepo, collectionRepo, designItemRepo, llm },
    });

    expect(capturedPrompt).toContain("Mega Man Mania");
    expect(capturedPrompt).toContain("Coleção retrô de Mega Man com pixel art.");
  });

  it("composition-definition requer collectionContext com execuções aprovadas", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const llm = makeFakeLLMProvider("composição");

    const collection = Collection.create({
      id: "col-ctx-1",
      name: "Coleção CTX",
      briefing: "Test.",
    });
    await collectionRepo.save(collection);

    // Item without collectionContext set — should fail eligibility
    const item = DesignItem.create({
      id: "item-ctx-1",
      collectionId: "col-ctx-1",
      name: "Item sem contexto",
    });
    await designItemRepo.save(item);

    await expect(
      runStageExecution({
        stageKey: "composition-definition",
        targetId: "item-ctx-1",
        deps: { executionRepo, collectionRepo, designItemRepo, llm },
      })
    ).rejects.toThrow(/not eligible/i);
  });

  it("composition-definition executa quando collectionContext está preenchido com execuções aprovadas", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const llm = makeFakeLLMProvider('{"composição":"ok"}');

    const collection = Collection.create({
      id: "col-ctx-2",
      name: "Coleção CTX2",
      briefing: "Test.",
    });
    await collectionRepo.save(collection);

    const execIds = await makeApprovedCollectionExecs(executionRepo, "col-ctx-2");

    const item = DesignItem.create({
      id: "item-ctx-2",
      collectionId: "col-ctx-2",
      name: "Item com contexto",
    }).setCollectionContext({
      "collection-briefing": { executionId: execIds["collection-briefing"] },
      "game-universe-extraction": { executionId: execIds["game-universe-extraction"] },
      "visual-style-definition": { executionId: execIds["visual-style-definition"], styleIndex: 0 },
    });
    await designItemRepo.save(item);

    const result = await runStageExecution({
      stageKey: "composition-definition",
      targetId: "item-ctx-2",
      deps: { executionRepo, collectionRepo, designItemRepo, llm },
    });

    expect(result.status).toBe("completed");
    expect(result.inputSnapshot).toHaveProperty("collectionContextOutputs");
    expect(result.inputSnapshot).toHaveProperty("styleIndex", 0);
  });

  it("gera imagens quando o estágio é visual-variation-generation", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const generatedImageRepo = new InMemoryGeneratedImageRepository();
    const llm = makeFakeLLMProvider("não deveria ser chamado");

    const collection = Collection.create({
      id: "col-img-1",
      name: "Coleção Zelda",
      briefing: "Camisetas Zelda.",
    });
    await collectionRepo.save(collection);

    const designItem = DesignItem.create({
      id: "item-img-1",
      collectionId: "col-img-1",
      name: "Camiseta Link",
    });
    await designItemRepo.save(designItem);

    // Pré-popula execuções aprovadas para as deps diretas
    const compositionExec = StageExecution.start({
      id: "exec-composition-1",
      stageKey: "composition-definition",
      targetId: "item-img-1",
      targetType: "design_item",
      inputSnapshot: {},
    })
      .complete({ content: '{"composição":"ok"}' })
      .approve({ actorId: "user-1" });
    await executionRepo.save(compositionExec);

    const masterExec = StageExecution.start({
      id: "exec-master-1",
      stageKey: "master-prompt-assembly",
      targetId: "item-img-1",
      targetType: "design_item",
      inputSnapshot: {},
    })
      .complete({ content: '{"masterPrompt": "A heroic scene of Link"}' })
      .approve({ actorId: "user-1" });
    await executionRepo.save(masterExec);

    const savedFiles: Array<{ path: string; data: Buffer }> = [];
    const imageProvider: ImageGenerationProvider = {
      async generateImages(): Promise<ImageGenerationResponse> {
        return {
          images: [
            { data: Buffer.from("fake-png-1"), mimeType: "image/png" },
            { data: Buffer.from("fake-png-2"), mimeType: "image/png" },
          ],
          provider: "fake-image",
          model: "fake-imagen",
        };
      },
    };

    const storage: AssetStorage = {
      async save(path, data) {
        savedFiles.push({ path, data });
        return path;
      },
      async read() { return Buffer.from(""); },
      getUrl(path) { return `/assets/${path}`; },
      async exists() { return false; },
    };

    const result = await runStageExecution({
      stageKey: "visual-variation-generation",
      targetId: "item-img-1",
      deps: {
        executionRepo,
        collectionRepo,
        designItemRepo,
        llm,
        imageProvider,
        storage,
        generatedImageRepo,
      },
    });

    expect(result.status).toBe("completed");
    expect(savedFiles).toHaveLength(2);
    expect(savedFiles[0].path).toContain("item-img-1");

    const images = await generatedImageRepo.findByDesignItemId("item-img-1");
    expect(images).toHaveLength(2);
    expect(images[0].sourceExecutionId).toBe(result.id);
    expect(images[0].provider).toBe("fake-image");
    expect(images[0].status).toBe("ready");
  });

  it("marca como failed quando imageProvider falha", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const generatedImageRepo = new InMemoryGeneratedImageRepository();
    const llm = makeFakeLLMProvider("não deveria ser chamado");

    const collection = Collection.create({
      id: "col-img-2",
      name: "Coleção Fallout",
      briefing: "Camisetas Fallout.",
    });
    await collectionRepo.save(collection);

    const designItem = DesignItem.create({
      id: "item-img-2",
      collectionId: "col-img-2",
      name: "Camiseta Vault Boy",
    });
    await designItemRepo.save(designItem);

    const masterExec = StageExecution.start({
      id: "exec-master-fail",
      stageKey: "master-prompt-assembly",
      targetId: "item-img-2",
      targetType: "design_item",
      inputSnapshot: {},
    })
      .complete({ content: '{"masterPrompt":"test"}' })
      .approve({ actorId: "user-1" });
    await executionRepo.save(masterExec);

    const compositionExec = StageExecution.start({
      id: "exec-comp-fail",
      stageKey: "composition-definition",
      targetId: "item-img-2",
      targetType: "design_item",
      inputSnapshot: {},
    })
      .complete({ content: '{"composição":"ok"}' })
      .approve({ actorId: "user-1" });
    await executionRepo.save(compositionExec);

    const failingImageProvider: ImageGenerationProvider = {
      async generateImages() { throw new Error("Imagen API indisponível"); },
    };

    const storage: AssetStorage = {
      async save(path) { return path; },
      async read() { return Buffer.from(""); },
      getUrl(path) { return `/assets/${path}`; },
      async exists() { return false; },
    };

    const result = await runStageExecution({
      stageKey: "visual-variation-generation",
      targetId: "item-img-2",
      deps: {
        executionRepo,
        collectionRepo,
        designItemRepo,
        llm,
        imageProvider: failingImageProvider,
        storage,
        generatedImageRepo,
      },
    });

    expect(result.status).toBe("failed");
    expect(result.failureReason).toBe("Imagen API indisponível");
  });

  it("lança erro se a coleção não existe no repositório", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const llm = makeFakeLLMProvider("qualquer");

    await expect(
      runStageExecution({
        stageKey: "collection-briefing",
        targetId: "id-inexistente",
        deps: { executionRepo, collectionRepo, designItemRepo, llm },
      }),
    ).rejects.toThrow(/not found/i);
  });
});

describe("stripCodeFences", () => {
  it("remove blocos ```json ... ```", () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(stripCodeFences(input)).toBe('{"key": "value"}');
  });

  it("remove blocos ``` ... ``` sem linguagem", () => {
    const input = '```\n{"key": "value"}\n```';
    expect(stripCodeFences(input)).toBe('{"key": "value"}');
  });

  it("retorna texto limpo se não houver fences", () => {
    const input = '{"key": "value"}';
    expect(stripCodeFences(input)).toBe('{"key": "value"}');
  });

  it("preserva conteúdo interno com múltiplas linhas", () => {
    const input = '```json\n{\n  "a": 1,\n  "b": 2\n}\n```';
    expect(stripCodeFences(input)).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });
});
