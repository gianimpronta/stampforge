import { describe, it, expect } from "vitest";
import { getStagePromptConfig } from "../../src/domain/pipeline/stagePrompts";
import { stageCatalog } from "../../src/domain/pipeline/stageCatalog";

describe("getStagePromptConfig", () => {
  it("retorna config para todos os 6 estágios do catálogo", () => {
    for (const stage of stageCatalog) {
      const config = getStagePromptConfig(stage.key);
      expect(config).toBeDefined();
      expect(config.systemPrompt).toBeTruthy();
      expect(typeof config.buildUserPrompt).toBe("function");
      expect(config.outputSchema).toBeDefined();
    }
  });

  it("lança erro para estágio desconhecido", () => {
    expect(() => getStagePromptConfig("nao-existe")).toThrow(/unknown stage/i);
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

  it("game-universe-extraction inclui output do briefing no prompt", () => {
    const config = getStagePromptConfig("game-universe-extraction");
    const prompt = config.buildUserPrompt({
      stageKey: "game-universe-extraction",
      targetId: "col-1",
      collection: { id: "col-1", name: "Retro Games", briefing: "..." },
      upstreamOutputs: {
        "collection-briefing": {
          content: JSON.stringify({
            interpretedTheme: "Jogos clássicos dos anos 80",
            selectedGames: [{ title: "Pac-Man" }],
          }),
        },
      },
    });
    expect(prompt).toContain("Jogos clássicos dos anos 80");
  });

  it("visual-style-definition gera prompt com output de game-universe-extraction", () => {
    const config = getStagePromptConfig("visual-style-definition");
    const prompt = config.buildUserPrompt({
      stageKey: "visual-style-definition",
      targetId: "col-1",
      upstreamOutputs: {
        "game-universe-extraction": {
          content: JSON.stringify({ universes: [{ gameTitle: "Pac-Man" }] }),
        },
      },
    });
    expect(prompt).toContain("visual-style-definition");
    expect(prompt).toContain("Pac-Man");
  });

  it("visual-style-definition outputSchema inclui 'styles'", () => {
    const config = getStagePromptConfig("visual-style-definition");
    expect(config.outputSchema).toHaveProperty("styles");
  });

  it("composition-definition usa collectionContextOutputs no prompt", () => {
    const config = getStagePromptConfig("composition-definition");
    const prompt = config.buildUserPrompt({
      stageKey: "composition-definition",
      targetId: "item-1",
      designItem: { id: "item-1", name: "Camiseta Pac-Man", collectionId: "col-1" },
      styleIndex: 2,
      collectionContextOutputs: {
        "collection-briefing": {
          content: JSON.stringify({ interpretedTheme: "Jogos Arcade" }),
        },
        "game-universe-extraction": {
          content: JSON.stringify({ universes: [{ gameTitle: "Pac-Man" }] }),
        },
        "visual-style-definition": {
          content: JSON.stringify({
            styles: [{ styleName: "Pixel Retro" }],
          }),
        },
      },
    });
    expect(prompt).toContain("composition-definition");
    expect(prompt).toContain("Camiseta Pac-Man");
    expect(prompt).toContain("Jogos Arcade");
  });

  it("composition-definition exibe styleIndex correto", () => {
    const config = getStagePromptConfig("composition-definition");
    const prompt = config.buildUserPrompt({
      stageKey: "composition-definition",
      targetId: "item-1",
      designItem: { id: "item-1", name: "Test", collectionId: "col-1" },
      styleIndex: 1,
      collectionContextOutputs: {},
    });
    expect(prompt).toContain("1");
  });

  it("master-prompt-assembly usa output de composition-definition", () => {
    const config = getStagePromptConfig("master-prompt-assembly");
    const prompt = config.buildUserPrompt({
      stageKey: "master-prompt-assembly",
      targetId: "item-1",
      designItem: { id: "item-1", name: "Design 1", collectionId: "col-1" },
      upstreamOutputs: {
        "composition-definition": {
          content: JSON.stringify({
            conceptTitle: "Space Warrior",
            copy: { primaryText: "Game Over" },
          }),
        },
      },
    });
    expect(prompt).toContain("master-prompt-assembly");
    expect(prompt).toContain("Space Warrior");
  });

  it("visual-variation-generation é marcado como estágio de imagem", () => {
    const config = getStagePromptConfig("visual-variation-generation");
    expect(config.isImageGeneration).toBe(true);
  });

  it("estágios 1-5 NÃO são marcados como estágio de imagem", () => {
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
      "visual-style-definition",
      "master-prompt-assembly",
      "visual-variation-generation",
    ];
    for (const key of stages) {
      const config = getStagePromptConfig(key);
      const prompt = config.buildUserPrompt({ stageKey: key, targetId: "t" });
      expect(prompt).toContain("N/A");
    }
  });

  it("extractUpstreamContent retorna vazio quando content é null/undefined na chave", () => {
    // Exercita a branch `?? ""` (linha 24): key existe mas content é undefined
    const config = getStagePromptConfig("game-universe-extraction");
    const prompt = config.buildUserPrompt({
      stageKey: "game-universe-extraction",
      targetId: "col-1",
      upstreamOutputs: {
        "collection-briefing": { content: undefined },
      },
    });
    // Sem content válido, deve cair no "N/A"
    expect(prompt).toContain("N/A");
  });

  it("extractCollectionContextContent retorna conteúdo quando presente", () => {
    // Exercita extractCollectionContextContent com dados reais (linhas 35-54)
    const config = getStagePromptConfig("composition-definition");
    const prompt = config.buildUserPrompt({
      stageKey: "composition-definition",
      targetId: "item-1",
      designItem: { id: "item-1", name: "Test Item", collectionId: "col-1" },
      styleIndex: 0,
      collectionContextOutputs: {
        "collection-briefing": { content: '{"interpretedTheme":"Arcade Nostalgia"}' },
        "game-universe-extraction": { content: '{"universes":[{"gameTitle":"Pac-Man"}]}' },
        "visual-style-definition": { content: '{"styles":[{"styleName":"Pixel Retro"}]}' },
      },
    });
    expect(prompt).toContain("Arcade Nostalgia");
    expect(prompt).toContain("Pac-Man");
    expect(prompt).toContain("Pixel Retro");
  });

  it("extractCollectionContextContent retorna vazio quando content é undefined na chave", () => {
    // Exercita o branch do if(!ctx?.[stageKey]?.content) quando key existe mas content é undefined
    const config = getStagePromptConfig("composition-definition");
    const prompt = config.buildUserPrompt({
      stageKey: "composition-definition",
      targetId: "item-1",
      designItem: { id: "item-1", name: "Test Item", collectionId: "col-1" },
      collectionContextOutputs: {
        "collection-briefing": { content: undefined },
        "game-universe-extraction": { content: undefined },
        "visual-style-definition": { content: undefined },
      },
    });
    expect(prompt).toContain("N/A");
  });

  it("composition-definition exibe N/A para item quando designItem é null", () => {
    // Exercita `item?.name ?? "N/A"` (linha 191)
    const config = getStagePromptConfig("composition-definition");
    const prompt = config.buildUserPrompt({
      stageKey: "composition-definition",
      targetId: "item-1",
      designItem: null,
      collectionContextOutputs: {},
    });
    expect(prompt).toContain("N/A");
  });

  it("composition-definition exibe N/A para styleIndex quando não fornecido", () => {
    // Exercita `styleIndex ?? "N/A"` (linha 199)
    const config = getStagePromptConfig("composition-definition");
    const prompt = config.buildUserPrompt({
      stageKey: "composition-definition",
      targetId: "item-1",
      designItem: { id: "item-1", name: "Test", collectionId: "col-1" },
      // styleIndex não fornecido
      collectionContextOutputs: {},
    });
    expect(prompt).toContain("índice N/A");
  });

  it("collection-briefing exibe N/A quando collection é null", () => {
    // Exercita o `col?.name ?? "N/A"` e `col?.briefing ?? "N/A"` quando collection é null
    const config = getStagePromptConfig("collection-briefing");
    const prompt = config.buildUserPrompt({
      stageKey: "collection-briefing",
      targetId: "col-1",
      collection: null,
    });
    expect(prompt).toContain("N/A");
  });
});
