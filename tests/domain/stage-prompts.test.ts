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

  it("game-universe-extraction gera prompt com output do game-selection", () => {
    const config = getStagePromptConfig("game-universe-extraction");
    const prompt = config.buildUserPrompt({
      stageKey: "game-universe-extraction",
      targetId: "col-1",
      upstreamOutputs: {
        "game-selection": {
          content: JSON.stringify({ selectedGames: ["Ark Nova", "Wingspan"] }),
        },
      },
    });
    expect(prompt).toContain("game-universe-extraction");
    expect(prompt).toContain("Ark Nova");
  });

  it("design-concept gera prompt com nome do item e output do game-universe-extraction", () => {
    const config = getStagePromptConfig("design-concept");
    const prompt = config.buildUserPrompt({
      stageKey: "design-concept",
      targetId: "item-1",
      designItem: { id: "item-1", name: "Angry Birds Tee", collectionId: "col-1" },
      upstreamOutputs: {
        "game-universe-extraction": {
          content: JSON.stringify({ universes: [{ gameTitle: "Ark Nova" }] }),
        },
      },
    });
    expect(prompt).toContain("design-concept");
    expect(prompt).toContain("Angry Birds Tee");
    expect(prompt).toContain("Ark Nova");
  });

  it("theme-definition gera prompt com output do design-concept", () => {
    const config = getStagePromptConfig("theme-definition");
    const prompt = config.buildUserPrompt({
      stageKey: "theme-definition",
      targetId: "item-1",
      upstreamOutputs: {
        "design-concept": {
          content: JSON.stringify({ conceptTitle: "Pixel Warrior" }),
        },
      },
    });
    expect(prompt).toContain("theme-definition");
    expect(prompt).toContain("Pixel Warrior");
  });

  it("visual-style-definition gera prompt com output do theme-definition", () => {
    const config = getStagePromptConfig("visual-style-definition");
    const prompt = config.buildUserPrompt({
      stageKey: "visual-style-definition",
      targetId: "item-1",
      upstreamOutputs: {
        "theme-definition": {
          content: JSON.stringify({ themeName: "Retro Arcade" }),
        },
      },
    });
    expect(prompt).toContain("visual-style-definition");
    expect(prompt).toContain("Retro Arcade");
  });

  it("copy-generation gera prompt com outputs de theme e visual-style", () => {
    const config = getStagePromptConfig("copy-generation");
    const prompt = config.buildUserPrompt({
      stageKey: "copy-generation",
      targetId: "item-1",
      upstreamOutputs: {
        "theme-definition": { content: JSON.stringify({ themeName: "Cosmic Wars" }) },
        "visual-style-definition": {
          content: JSON.stringify({ illustrationStyle: "pixel art" }),
        },
      },
    });
    expect(prompt).toContain("copy-generation");
    expect(prompt).toContain("Cosmic Wars");
    expect(prompt).toContain("pixel art");
  });

  it("shirt-composition-definition gera prompt com outputs de style e copy", () => {
    const config = getStagePromptConfig("shirt-composition-definition");
    const prompt = config.buildUserPrompt({
      stageKey: "shirt-composition-definition",
      targetId: "item-1",
      upstreamOutputs: {
        "visual-style-definition": {
          content: JSON.stringify({ illustrationStyle: "vector" }),
        },
        "copy-generation": {
          content: JSON.stringify({ primaryText: "Insert Coin" }),
        },
      },
    });
    expect(prompt).toContain("shirt-composition-definition");
    expect(prompt).toContain("Insert Coin");
  });

  it("production-constraints-definition gera prompt com output de shirt-composition", () => {
    const config = getStagePromptConfig("production-constraints-definition");
    const prompt = config.buildUserPrompt({
      stageKey: "production-constraints-definition",
      targetId: "item-1",
      upstreamOutputs: {
        "shirt-composition-definition": {
          content: JSON.stringify({ printArea: "full front" }),
        },
      },
    });
    expect(prompt).toContain("production-constraints-definition");
    expect(prompt).toContain("full front");
  });

  it("visual-variation-generation gera prompt com output do master-prompt-assembly", () => {
    const config = getStagePromptConfig("visual-variation-generation");
    const prompt = config.buildUserPrompt({
      stageKey: "visual-variation-generation",
      targetId: "item-1",
      upstreamOutputs: {
        "master-prompt-assembly": {
          content: JSON.stringify({ masterPrompt: "epic pixel art warrior" }),
        },
      },
    });
    expect(prompt).toContain("visual-variation-generation");
    expect(prompt).toContain("epic pixel art warrior");
  });

  it("buildUserPrompt retorna N/A quando outputs upstream estão ausentes", () => {
    const stages = [
      "game-universe-extraction",
      "design-concept",
      "theme-definition",
      "visual-style-definition",
      "copy-generation",
      "shirt-composition-definition",
      "production-constraints-definition",
      "visual-variation-generation",
    ];
    for (const key of stages) {
      const config = getStagePromptConfig(key);
      const prompt = config.buildUserPrompt({ stageKey: key, targetId: "t" });
      expect(prompt).toContain("N/A");
    }
  });
});
