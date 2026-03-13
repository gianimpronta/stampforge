import { describe, it, expect } from "vitest";
import { getStagePromptConfig } from "../../src/domain/pipeline/stagePrompts";
import { stageCatalog } from "../../src/domain/pipeline/stageCatalog";

describe("getStagePromptConfig", () => {
  it("retorna config para todos os 11 estágios do catálogo", () => {
    for (const stage of stageCatalog) {
      const config = getStagePromptConfig(stage.key);
      expect(config).toBeDefined();
      expect(config.systemPrompt).toBeTruthy();
      expect(typeof config.buildUserPrompt).toBe("function");
      expect(config.outputSchema).toBeDefined();
    }
  });

  it("lança erro para estágio desconhecido", () => {
    expect(() => getStagePromptConfig("nao-existe")).toThrow(
      /unknown stage/i,
    );
  });

  it("system prompt contém regras de formatação JSON", () => {
    const config = getStagePromptConfig("collection-briefing");
    expect(config.systemPrompt).toContain("JSON");
    expect(config.systemPrompt).toContain("schema");
  });

  it("collection-briefing gera user prompt com dados da coleção", () => {
    const config = getStagePromptConfig("collection-briefing");
    const prompt = config.buildUserPrompt({
      stageKey: "collection-briefing",
      targetId: "abc-123",
      collection: {
        id: "abc-123",
        name: "Retro Games",
        briefing: "Camisetas pixel art de jogos clássicos",
      },
    });
    expect(prompt).toContain("Retro Games");
    expect(prompt).toContain("Camisetas pixel art de jogos clássicos");
    expect(prompt).toContain("collection-briefing");
  });

  it("game-selection inclui output do briefing no prompt", () => {
    const config = getStagePromptConfig("game-selection");
    const prompt = config.buildUserPrompt({
      stageKey: "game-selection",
      targetId: "abc-123",
      collection: { id: "abc-123", name: "Retro Games", briefing: "..." },
      upstreamOutputs: {
        "collection-briefing": {
          content: JSON.stringify({
            interpretedTheme: "Jogos clássicos dos anos 80",
            keywords: ["pixel", "arcade"],
          }),
        },
      },
    });
    expect(prompt).toContain("Jogos clássicos dos anos 80");
  });

  it("master-prompt-assembly inclui outputs de todos os estágios upstream", () => {
    const config = getStagePromptConfig("master-prompt-assembly");
    const upstreamOutputs: Record<string, unknown> = {
      "design-concept": { content: '{"conceptTitle":"Space Warrior"}' },
      "theme-definition": { content: '{"themeName":"Retro Space"}' },
      "visual-style-definition": {
        content: '{"illustrationStyle":"pixel art"}',
      },
      "copy-generation": { content: '{"primaryText":"Game Over"}' },
      "shirt-composition-definition": {
        content: '{"printArea":"full front"}',
      },
      "production-constraints-definition": {
        content: '{"maxColors":6}',
      },
    };
    const prompt = config.buildUserPrompt({
      stageKey: "master-prompt-assembly",
      targetId: "item-1",
      designItem: { id: "item-1", name: "Design 1", collectionId: "col-1" },
      upstreamOutputs,
    });
    expect(prompt).toContain("design-concept");
    expect(prompt).toContain("theme-definition");
    expect(prompt).toContain("visual-style-definition");
    expect(prompt).toContain("copy-generation");
    expect(prompt).toContain("shirt-composition-definition");
    expect(prompt).toContain("production-constraints-definition");
  });

  it("visual-variation-generation é marcado como estágio de imagem", () => {
    const config = getStagePromptConfig("visual-variation-generation");
    expect(config.isImageGeneration).toBe(true);
  });

  it("estágios 1-10 NÃO são marcados como estágio de imagem", () => {
    const nonImageStages = stageCatalog.filter(
      (s) => s.key !== "visual-variation-generation",
    );
    for (const stage of nonImageStages) {
      const config = getStagePromptConfig(stage.key);
      expect(config.isImageGeneration).toBeFalsy();
    }
  });

  it("outputSchema de cada estágio tem campos definidos", () => {
    for (const stage of stageCatalog) {
      const config = getStagePromptConfig(stage.key);
      const schemaKeys = Object.keys(config.outputSchema);
      expect(schemaKeys.length).toBeGreaterThan(0);
    }
  });
});
