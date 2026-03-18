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

  it("rejeita design_item stage quando dependência same-scope não está aprovada", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const llm = makeFakeLLMProvider("qualquer");

    const collection = Collection.create({
      id: "col-samedep-1",
      name: "Coleção",
      briefing: "test",
    });
    await collectionRepo.save(collection);

    const designItem = DesignItem.create({
      id: "item-samedep-1",
      collectionId: "col-samedep-1",
      name: "Item",
    });
    await designItemRepo.save(designItem);

    // master-prompt-assembly depende de composition-definition (same-scope), que não está aprovado
    await expect(
      runStageExecution({
        stageKey: "master-prompt-assembly",
        targetId: "item-samedep-1",
        deps: { executionRepo, collectionRepo, designItemRepo, llm },
      }),
    ).rejects.toThrow(/not eligible.*composition-definition/i);
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

  it("marca como failed quando imageProvider não é fornecido para visual-variation-generation", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const llm = makeFakeLLMProvider("não deveria ser chamado");

    const collection = Collection.create({
      id: "col-nodeps-1",
      name: "Coleção",
      briefing: "test",
    });
    await collectionRepo.save(collection);

    const designItem = DesignItem.create({
      id: "item-nodeps-1",
      collectionId: "col-nodeps-1",
      name: "Item",
    });
    await designItemRepo.save(designItem);

    const masterExec = StageExecution.start({
      id: "exec-master-nodeps",
      stageKey: "master-prompt-assembly",
      targetId: "item-nodeps-1",
      targetType: "design_item",
      inputSnapshot: {},
    })
      .complete({ content: '{"masterPrompt":"test"}' })
      .approve({ actorId: "user-1" });
    await executionRepo.save(masterExec);

    const compositionExec = StageExecution.start({
      id: "exec-comp-nodeps",
      stageKey: "composition-definition",
      targetId: "item-nodeps-1",
      targetType: "design_item",
      inputSnapshot: {},
    })
      .complete({ content: '{"composição":"ok"}' })
      .approve({ actorId: "user-1" });
    await executionRepo.save(compositionExec);

    // Sem imageProvider, storage, nem generatedImageRepo
    const result = await runStageExecution({
      stageKey: "visual-variation-generation",
      targetId: "item-nodeps-1",
      deps: { executionRepo, collectionRepo, designItemRepo, llm },
    });

    expect(result.status).toBe("failed");
    expect(result.failureReason).toContain("Image generation dependencies");
  });

  it("usa masterContent como prompt direto quando não é JSON válido", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const generatedImageRepo = new InMemoryGeneratedImageRepository();
    const llm = makeFakeLLMProvider("não deveria ser chamado");

    const collection = Collection.create({
      id: "col-plaintext-1",
      name: "Coleção",
      briefing: "test",
    });
    await collectionRepo.save(collection);

    const designItem = DesignItem.create({
      id: "item-plaintext-1",
      collectionId: "col-plaintext-1",
      name: "Item",
    });
    await designItemRepo.save(designItem);

    // Master prompt com texto puro (não JSON) — exercita o catch do JSON.parse
    const masterExec = StageExecution.start({
      id: "exec-master-plaintext",
      stageKey: "master-prompt-assembly",
      targetId: "item-plaintext-1",
      targetType: "design_item",
      inputSnapshot: {},
    })
      .complete({ content: "pixel art warrior on a t-shirt" })
      .approve({ actorId: "user-1" });
    await executionRepo.save(masterExec);

    const compositionExec = StageExecution.start({
      id: "exec-comp-plaintext",
      stageKey: "composition-definition",
      targetId: "item-plaintext-1",
      targetType: "design_item",
      inputSnapshot: {},
    })
      .complete({ content: '{"composição":"ok"}' })
      .approve({ actorId: "user-1" });
    await executionRepo.save(compositionExec);

    let capturedPrompt = "";
    const imageProvider: ImageGenerationProvider = {
      async generateImages(req): Promise<ImageGenerationResponse> {
        capturedPrompt = req.prompt;
        return {
          images: [{ data: Buffer.from("img"), mimeType: "image/png" }],
          provider: "fake",
          model: "fake",
        };
      },
    };

    const storage: AssetStorage = {
      async save(path) { return path; },
      async read() { return Buffer.from(""); },
      getUrl(path) { return `/assets/${path}`; },
      async exists() { return false; },
    };

    const result = await runStageExecution({
      stageKey: "visual-variation-generation",
      targetId: "item-plaintext-1",
      deps: { executionRepo, collectionRepo, designItemRepo, llm, imageProvider, storage, generatedImageRepo },
    });

    expect(result.status).toBe("completed");
    expect(capturedPrompt).toBe("pixel art warrior on a t-shirt");
  });

  it("lança erro em buildInputSnapshot quando designItem desaparece entre eligibilidade e snapshot", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const llm = makeFakeLLMProvider("qualquer");

    const collection = Collection.create({
      id: "col-vanish-1",
      name: "Coleção",
      briefing: "test",
    });
    await collectionRepo.save(collection);

    const theItem = DesignItem.create({
      id: "item-vanish-1",
      collectionId: "col-vanish-1",
      name: "Item",
    });

    const compositionExec = StageExecution.start({
      id: "exec-comp-vanish",
      stageKey: "composition-definition",
      targetId: "item-vanish-1",
      targetType: "design_item",
      inputSnapshot: {},
    })
      .complete({ content: '{"ok":true}' })
      .approve({ actorId: "user-1" });
    await executionRepo.save(compositionExec);

    // Mock que retorna o item na 1ª chamada (eligibilidade) e null na 2ª (buildInputSnapshot)
    let callCount = 0;
    const trickRepo = {
      async findById(_id: string): Promise<DesignItem | null> {
        callCount++;
        return callCount === 1 ? theItem : null;
      },
      async save(): Promise<void> {},
      async findByCollectionId(): Promise<DesignItem[]> { return []; },
    };

    await expect(
      runStageExecution({
        stageKey: "master-prompt-assembly",
        targetId: "item-vanish-1",
        deps: { executionRepo, collectionRepo, designItemRepo: trickRepo, llm },
      }),
    ).rejects.toThrow(/DesignItem not found/i);
  });

  it("marca como failed quando LLM lança exceção não-Error (string)", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const llm: LLMProvider = {
      async generateText(): Promise<LLMResponse> {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "erro em forma de string";
      },
    };

    const collection = Collection.create({
      id: "col-strerr-1",
      name: "Coleção",
      briefing: "test",
    });
    await collectionRepo.save(collection);

    const result = await runStageExecution({
      stageKey: "collection-briefing",
      targetId: "col-strerr-1",
      deps: { executionRepo, collectionRepo, designItemRepo, llm },
    });

    expect(result.status).toBe("failed");
    expect(result.failureReason).toContain("erro em forma de string");
  });

  it("marca como failed quando imageProvider lança exceção não-Error (string)", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const generatedImageRepo = new InMemoryGeneratedImageRepository();
    const llm = makeFakeLLMProvider("não deveria ser chamado");

    const collection = Collection.create({ id: "col-imgstrerr-1", name: "Coleção", briefing: "test" });
    await collectionRepo.save(collection);

    const designItem = DesignItem.create({ id: "item-imgstrerr-1", collectionId: "col-imgstrerr-1", name: "Item" });
    await designItemRepo.save(designItem);

    const masterExec = StageExecution.start({
      id: "exec-master-imgstrerr",
      stageKey: "master-prompt-assembly",
      targetId: "item-imgstrerr-1",
      targetType: "design_item",
      inputSnapshot: {},
    }).complete({ content: '{"masterPrompt":"test"}' }).approve({ actorId: "user-1" });
    await executionRepo.save(masterExec);

    const compositionExec = StageExecution.start({
      id: "exec-comp-imgstrerr",
      stageKey: "composition-definition",
      targetId: "item-imgstrerr-1",
      targetType: "design_item",
      inputSnapshot: {},
    }).complete({ content: '{"ok":true}' }).approve({ actorId: "user-1" });
    await executionRepo.save(compositionExec);

    const imageProvider: ImageGenerationProvider = {
      async generateImages(): Promise<ImageGenerationResponse> {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "provider crashed with string";
      },
    };
    const storage: AssetStorage = {
      async save(path) { return path; },
      async read() { return Buffer.from(""); },
      getUrl(path) { return `/assets/${path}`; },
      async exists() { return false; },
    };

    const result = await runStageExecution({
      stageKey: "visual-variation-generation",
      targetId: "item-imgstrerr-1",
      deps: { executionRepo, collectionRepo, designItemRepo, llm, imageProvider, storage, generatedImageRepo },
    });

    expect(result.status).toBe("failed");
    expect(result.failureReason).toContain("provider crashed with string");
  });

  it("ignora entrada de collectionContext quando execução referenciada não existe no repo (exec null)", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const llm = makeFakeLLMProvider('{"result":"ok"}');

    const collection = Collection.create({ id: "col-ctxnull-1", name: "Coleção", briefing: "test" });
    await collectionRepo.save(collection);

    // designItem com collectionContext apontando para execuções inexistentes
    const designItem = DesignItem.create({ id: "item-ctxnull-1", collectionId: "col-ctxnull-1", name: "Item" })
      .setCollectionContext({
        "collection-briefing": { executionId: "exec-inexistente-briefing" },
        "game-universe-extraction": { executionId: "exec-inexistente-universe" },
        "visual-style-definition": { executionId: "exec-inexistente-style" },
      });
    await designItemRepo.save(designItem);

    // Aprova composition-definition (sem collectionDeps) para que master-prompt-assembly passe eligibilidade
    const compositionExec = StageExecution.start({
      id: "exec-comp-ctxnull",
      stageKey: "composition-definition",
      targetId: "item-ctxnull-1",
      targetType: "design_item",
      inputSnapshot: {},
    }).complete({ content: '{"ok":true}' }).approve({ actorId: "user-1" });
    await executionRepo.save(compositionExec);

    // master-prompt-assembly não tem collectionDependencies — deve passar mesmo com contexto "morto"
    const result = await runStageExecution({
      stageKey: "master-prompt-assembly",
      targetId: "item-ctxnull-1",
      deps: { executionRepo, collectionRepo, designItemRepo, llm },
    });

    expect(result.status).toBe("completed");
  });

  it("lança not eligible quando collectionContext tem entries definidas mas execuções não estão aprovadas", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const llm = makeFakeLLMProvider("qualquer");

    const collection = Collection.create({ id: "col-ctxnoapp-1", name: "Coleção", briefing: "test" });
    await collectionRepo.save(collection);

    // collectionContext com entries definidas, mas executionIds inexistentes → !entry é false, mas !has(id) é true
    const designItem = DesignItem.create({ id: "item-ctxnoapp-1", collectionId: "col-ctxnoapp-1", name: "Item" })
      .setCollectionContext({
        "collection-briefing": { executionId: "exec-noapp-briefing" },
        "game-universe-extraction": { executionId: "exec-noapp-universe" },
        "visual-style-definition": { executionId: "exec-noapp-style" },
      });
    await designItemRepo.save(designItem);

    // Nenhuma das execuções referenciadas existe no repo → não serão aprovadas
    await expect(
      runStageExecution({
        stageKey: "composition-definition",
        targetId: "item-ctxnoapp-1",
        deps: { executionRepo, collectionRepo, designItemRepo, llm },
      }),
    ).rejects.toThrow(/not eligible.*collectionContext/i);
  });

  it("usa prompt padrão quando master outputSnapshot não tem campo 'content' (masterContent vazio)", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const generatedImageRepo = new InMemoryGeneratedImageRepository();
    const llm = makeFakeLLMProvider("não deveria ser chamado");

    const collection = Collection.create({ id: "col-nocontent-1", name: "Coleção", briefing: "test" });
    await collectionRepo.save(collection);

    const designItem = DesignItem.create({ id: "item-nocontent-1", collectionId: "col-nocontent-1", name: "Item" });
    await designItemRepo.save(designItem);

    // outputSnapshot sem campo 'content' → upstream.content é undefined → ?? "" → masterContent = ""
    const masterExec = StageExecution.reconstruct({
      id: "exec-master-nocontent",
      stageKey: "master-prompt-assembly",
      targetId: "item-nocontent-1",
      targetType: "design_item",
      status: "approved",
      inputSnapshot: {},
      outputSnapshot: { provider: "fake", model: "fake" }, // sem 'content'
      startedAt: new Date(),
      completedAt: new Date(),
      approvedBy: "system",
      approvedAt: new Date(),
      rejectedBy: null, rejectedAt: null, rejectionReason: null, failureReason: null,
    });
    await executionRepo.save(masterExec);

    let capturedPrompt = "";
    const imageProvider: ImageGenerationProvider = {
      async generateImages(req): Promise<ImageGenerationResponse> {
        capturedPrompt = req.prompt;
        return { images: [{ data: Buffer.from("img"), mimeType: "image/png" }], provider: "fake", model: "fake" };
      },
    };
    const storage: AssetStorage = {
      async save(path) { return path; },
      async read() { return Buffer.from(""); },
      getUrl(path) { return `/assets/${path}`; },
      async exists() { return false; },
    };

    await runStageExecution({
      stageKey: "visual-variation-generation",
      targetId: "item-nocontent-1",
      deps: { executionRepo, collectionRepo, designItemRepo, llm, imageProvider, storage, generatedImageRepo },
    });

    expect(capturedPrompt).toBe("Generate a t-shirt design");
  });

  it("usa parsed.prompt quando JSON do master não tem masterPrompt", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const generatedImageRepo = new InMemoryGeneratedImageRepository();
    const llm = makeFakeLLMProvider("não deveria ser chamado");

    const collection = Collection.create({ id: "col-prmpt-1", name: "Coleção", briefing: "test" });
    await collectionRepo.save(collection);

    const designItem = DesignItem.create({ id: "item-prmpt-1", collectionId: "col-prmpt-1", name: "Item" });
    await designItemRepo.save(designItem);

    const masterExec = StageExecution.reconstruct({
      id: "exec-master-prmpt",
      stageKey: "master-prompt-assembly",
      targetId: "item-prmpt-1",
      targetType: "design_item",
      status: "approved",
      inputSnapshot: {},
      outputSnapshot: { content: '{"prompt":"pixel warrior fallback"}', provider: "fake", model: "fake" },
      startedAt: new Date(), completedAt: new Date(),
      approvedBy: "system", approvedAt: new Date(),
      rejectedBy: null, rejectedAt: null, rejectionReason: null, failureReason: null,
    });
    await executionRepo.save(masterExec);

    let capturedPrompt = "";
    const imageProvider: ImageGenerationProvider = {
      async generateImages(req): Promise<ImageGenerationResponse> {
        capturedPrompt = req.prompt;
        return { images: [{ data: Buffer.from("img"), mimeType: "image/png" }], provider: "fake", model: "fake" };
      },
    };
    const storage: AssetStorage = {
      async save(path) { return path; },
      async read() { return Buffer.from(""); },
      getUrl(path) { return `/assets/${path}`; },
      async exists() { return false; },
    };

    await runStageExecution({
      stageKey: "visual-variation-generation",
      targetId: "item-prmpt-1",
      deps: { executionRepo, collectionRepo, designItemRepo, llm, imageProvider, storage, generatedImageRepo },
    });

    expect(capturedPrompt).toBe("pixel warrior fallback");
  });

  it("usa masterContent quando JSON do master não tem masterPrompt nem prompt", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const generatedImageRepo = new InMemoryGeneratedImageRepository();
    const llm = makeFakeLLMProvider("não deveria ser chamado");

    const collection = Collection.create({ id: "col-mstrcnt-1", name: "Coleção", briefing: "test" });
    await collectionRepo.save(collection);

    const designItem = DesignItem.create({ id: "item-mstrcnt-1", collectionId: "col-mstrcnt-1", name: "Item" });
    await designItemRepo.save(designItem);

    const masterExec = StageExecution.reconstruct({
      id: "exec-master-mstrcnt",
      stageKey: "master-prompt-assembly",
      targetId: "item-mstrcnt-1",
      targetType: "design_item",
      status: "approved",
      inputSnapshot: {},
      outputSnapshot: { content: '{"other":"valor-qualquer"}', provider: "fake", model: "fake" },
      startedAt: new Date(), completedAt: new Date(),
      approvedBy: "system", approvedAt: new Date(),
      rejectedBy: null, rejectedAt: null, rejectionReason: null, failureReason: null,
    });
    await executionRepo.save(masterExec);

    let capturedPrompt = "";
    const imageProvider: ImageGenerationProvider = {
      async generateImages(req): Promise<ImageGenerationResponse> {
        capturedPrompt = req.prompt;
        return { images: [{ data: Buffer.from("img"), mimeType: "image/png" }], provider: "fake", model: "fake" };
      },
    };
    const storage: AssetStorage = {
      async save(path) { return path; },
      async read() { return Buffer.from(""); },
      getUrl(path) { return `/assets/${path}`; },
      async exists() { return false; },
    };

    await runStageExecution({
      stageKey: "visual-variation-generation",
      targetId: "item-mstrcnt-1",
      deps: { executionRepo, collectionRepo, designItemRepo, llm, imageProvider, storage, generatedImageRepo },
    });

    // Sem masterPrompt e sem prompt → usa o próprio masterContent como prompt
    expect(capturedPrompt).toBe('{"other":"valor-qualquer"}');
  });

  it("usa extensão 'png' quando mimeType não contém barra (fallback ?? 'png')", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const generatedImageRepo = new InMemoryGeneratedImageRepository();
    const llm = makeFakeLLMProvider("não deveria ser chamado");

    const collection = Collection.create({ id: "col-mtype-1", name: "Coleção", briefing: "test" });
    await collectionRepo.save(collection);

    const designItem = DesignItem.create({ id: "item-mtype-1", collectionId: "col-mtype-1", name: "Item" });
    await designItemRepo.save(designItem);

    const masterExec = StageExecution.reconstruct({
      id: "exec-master-mtype",
      stageKey: "master-prompt-assembly",
      targetId: "item-mtype-1",
      targetType: "design_item",
      status: "approved",
      inputSnapshot: {},
      outputSnapshot: { content: '{"masterPrompt":"t-shirt design"}', provider: "fake", model: "fake" },
      startedAt: new Date(), completedAt: new Date(),
      approvedBy: "system", approvedAt: new Date(),
      rejectedBy: null, rejectedAt: null, rejectionReason: null, failureReason: null,
    });
    await executionRepo.save(masterExec);

    const imageProvider: ImageGenerationProvider = {
      async generateImages(): Promise<ImageGenerationResponse> {
        // mimeType sem barra "/" → split("/")[1] é undefined → ?? "png"
        return { images: [{ data: Buffer.from("img"), mimeType: "rawpng" }], provider: "fake", model: "fake" };
      },
    };
    const storage: AssetStorage = {
      async save(path) { return path; },
      async read() { return Buffer.from(""); },
      getUrl(path) { return `/assets/${path}`; },
      async exists() { return false; },
    };

    const result = await runStageExecution({
      stageKey: "visual-variation-generation",
      targetId: "item-mtype-1",
      deps: { executionRepo, collectionRepo, designItemRepo, llm, imageProvider, storage, generatedImageRepo },
    });

    expect(result.status).toBe("completed");
    const output = JSON.parse(result.outputSnapshot!.content as string) as { generatedImages: Array<{ filePath: string }> };
    expect(output.generatedImages[0].filePath).toMatch(/\.png$/);
  });

  it("skipa outputSnapshot nulo de exec aprovada no collectionContext (linha 82)", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const llm = makeFakeLLMProvider('{"result":"ok"}');

    const collection = Collection.create({ id: "col-nullos-1", name: "Coleção", briefing: "test" });
    await collectionRepo.save(collection);

    // Execuções de collection stage aprovadas mas com outputSnapshot nulo
    const colStages = ["collection-briefing", "game-universe-extraction", "visual-style-definition"] as const;
    const contextEntries: Record<string, { executionId: string }> = {};
    for (const key of colStages) {
      const execId = `exec-nullos-${key}`;
      contextEntries[key] = { executionId: execId };
      const exec = StageExecution.reconstruct({
        id: execId,
        stageKey: key,
        targetId: "col-nullos-1",
        targetType: "collection",
        status: "approved",
        inputSnapshot: {},
        outputSnapshot: null, // aprovada mas sem outputSnapshot
        startedAt: new Date(), completedAt: new Date(),
        approvedBy: "system", approvedAt: new Date(),
        rejectedBy: null, rejectedAt: null, rejectionReason: null, failureReason: null,
      });
      await executionRepo.save(exec);
    }

    const designItem = DesignItem.create({ id: "item-nullos-1", collectionId: "col-nullos-1", name: "Item" })
      .setCollectionContext(contextEntries);
    await designItemRepo.save(designItem);

    // composition-definition: execs aprovadas e no approvedCollectionExecutionIds → elegível
    // mas collectionContextOutputs ficará vazio (outputSnapshot é null → linha 82 false branch)
    const result = await runStageExecution({
      stageKey: "composition-definition",
      targetId: "item-nullos-1",
      deps: { executionRepo, collectionRepo, designItemRepo, llm },
    });

    expect(result.status).toBe("completed");
  });

  it("buildInputSnapshot não inclui upstreamOutputs quando dep aprovada tem outputSnapshot nulo", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const llm = makeFakeLLMProvider('{"result":"ok"}');

    const collection = Collection.create({ id: "col-nullsnap-1", name: "Coleção", briefing: "test" });
    await collectionRepo.save(collection);

    const designItem = DesignItem.create({ id: "item-nullsnap-1", collectionId: "col-nullsnap-1", name: "Item" });
    await designItemRepo.save(designItem);

    // composition-definition aprovada mas com outputSnapshot nulo → não será incluída em upstreamOutputs
    const compExec = StageExecution.reconstruct({
      id: "exec-comp-nullsnap",
      stageKey: "composition-definition",
      targetId: "item-nullsnap-1",
      targetType: "design_item",
      status: "approved",
      inputSnapshot: {},
      outputSnapshot: null, // null outputSnapshot
      startedAt: new Date(), completedAt: new Date(),
      approvedBy: "system", approvedAt: new Date(),
      rejectedBy: null, rejectedAt: null, rejectionReason: null, failureReason: null,
    });
    await executionRepo.save(compExec);

    // master-prompt-assembly depende de composition-definition → passa eligibilidade pois está "approved"
    // mas upstreamOutputs ficará vazio (outputSnapshot é null)
    const result = await runStageExecution({
      stageKey: "master-prompt-assembly",
      targetId: "item-nullsnap-1",
      deps: { executionRepo, collectionRepo, designItemRepo, llm },
    });

    expect(result.status).toBe("completed");
  });

  it("lança erro se o DesignItem não existe para estágio design_item", async () => {
    const executionRepo = new InMemoryStageExecutionRepository();
    const collectionRepo = new InMemoryCollectionRepository();
    const designItemRepo = new InMemoryDesignItemRepository();
    const generatedImageRepo = new InMemoryGeneratedImageRepository();
    const llm = makeFakeLLMProvider("não deveria ser chamado");

    const collection = Collection.create({
      id: "col-missingitem-1",
      name: "Coleção",
      briefing: "test",
    });
    await collectionRepo.save(collection);

    // Pré-popula a execução para passar a eligibilidade (composition-definition sem colDeps)
    const compositionExec = StageExecution.start({
      id: "exec-comp-missing",
      stageKey: "composition-definition",
      targetId: "item-missing-1",
      targetType: "design_item",
      inputSnapshot: {},
    })
      .complete({ content: '{"ok":true}' })
      .approve({ actorId: "user-1" });
    await executionRepo.save(compositionExec);

    // Item salvo no repo para passar a eligibilidade, mas removemos antes do buildInputSnapshot
    const tempItem = DesignItem.create({
      id: "item-missing-1",
      collectionId: "col-missingitem-1",
      name: "Item temporário",
    }).setCollectionContext({
      "collection-briefing": { executionId: "exec-missing-briefing" },
      "game-universe-extraction": { executionId: "exec-missing-universe" },
      "visual-style-definition": { executionId: "exec-missing-style" },
    });

    // Salva execuções aprovadas para collectionContext
    for (const [key, entry] of Object.entries(tempItem.collectionContext)) {
      if (!entry) continue;
      const exec = StageExecution.start({
        id: entry.executionId,
        stageKey: key,
        targetId: "col-missingitem-1",
        targetType: "collection",
        inputSnapshot: {},
      })
        .complete({ content: `{"result":"${key}"}` })
        .approve({ actorId: "system" });
      await executionRepo.save(exec);
    }

    await designItemRepo.save(tempItem);

    // Usa master-prompt-assembly que não tem collectionDeps — só depends em composition-definition
    const masterExec = StageExecution.start({
      id: "exec-master-missing",
      stageKey: "master-prompt-assembly",
      targetId: "item-missing-1",
      targetType: "design_item",
      inputSnapshot: {},
    })
      .complete({ content: '{"masterPrompt":"test"}' })
      .approve({ actorId: "user-1" });
    await executionRepo.save(masterExec);

    // Remove o item do repo para forçar "not found" no buildInputSnapshot
    const emptyRepo = new InMemoryDesignItemRepository();

    const imageProvider: ImageGenerationProvider = {
      async generateImages(): Promise<ImageGenerationResponse> {
        return { images: [], provider: "fake", model: "fake" };
      },
    };
    const storage: AssetStorage = {
      async save(path) { return path; },
      async read() { return Buffer.from(""); },
      getUrl(path) { return `/assets/${path}`; },
      async exists() { return false; },
    };

    await expect(
      runStageExecution({
        stageKey: "visual-variation-generation",
        targetId: "item-missing-1",
        deps: { executionRepo, collectionRepo, designItemRepo: emptyRepo, llm, imageProvider, storage, generatedImageRepo },
      }),
    ).rejects.toThrow(/DesignItem not found/i);
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
