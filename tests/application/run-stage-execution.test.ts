import { describe, expect, it } from "vitest";
import { runStageExecution, stripCodeFences } from "../../src/application/runStageExecution";
import { InMemoryStageExecutionRepository } from "../../src/infrastructure/db/repositories/InMemoryStageExecutionRepository";
import { InMemoryCollectionRepository } from "../../src/infrastructure/db/repositories/InMemoryCollectionRepository";
import { InMemoryDesignItemRepository } from "../../src/infrastructure/db/repositories/InMemoryDesignItemRepository";
import { Collection } from "../../src/domain/collections/Collection";
import { StageExecution } from "../../src/domain/pipeline/StageExecution";
import type { LLMProvider, LLMResponse } from "../../src/domain/providers/LLMProvider";

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
    const llm = makeFakeLLMProvider("seleção de jogo processada");

    const collection = Collection.create({
      id: "col-2",
      name: "Coleção Mario",
      briefing: "Uma coleção inspirada no universo de Mario.",
    });
    await collectionRepo.save(collection);

    // game-selection depende de collection-briefing aprovado
    // não há nenhuma execução aprovada no repo, então deve falhar
    await expect(
      runStageExecution({
        stageKey: "game-selection",
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
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe("failed");
  });

  it("passa o input snapshot com dados do alvo e das dependências aprovadas", async () => {
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
      id: "col-4",
      name: "Coleção FF",
      briefing: "Final Fantasy collection briefing.",
    });
    await collectionRepo.save(collection);

    // pré-popula execução aprovada do collection-briefing
    const briefingExec = StageExecution.start({
      id: "exec-briefing-1",
      stageKey: "collection-briefing",
      targetId: "col-4",
      targetType: "collection",
      inputSnapshot: { briefing: "Final Fantasy collection briefing." },
    })
      .complete({ content: "Briefing processado" })
      .approve({ actorId: "user-1" });
    await executionRepo.save(briefingExec);

    await runStageExecution({
      stageKey: "game-selection",
      targetId: "col-4",
      deps: { executionRepo, collectionRepo, designItemRepo, llm },
    });

    expect(capturedPrompt).toContain("game-selection");
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
    expect(capturedPrompt).toContain("collectionName");
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
