export interface StagePromptConfig {
  systemPrompt: string;
  buildUserPrompt: (inputSnapshot: Record<string, unknown>) => string;
  outputSchema: Record<string, string>;
  isImageGeneration?: boolean;
}

const BASE_SYSTEM_PROMPT = `Você é um especialista em criação de coleções de camisetas temáticas baseadas em jogos.

Regras obrigatórias:
- Responda APENAS com JSON válido, sem markdown, sem blocos de código, sem texto adicional.
- Siga exatamente o schema de saída especificado.
- Use os dados de entrada fornecidos. NÃO faça perguntas ao usuário.
- Todos os textos em português brasileiro, exceto termos técnicos de design e nomes de jogos.`;

function extractUpstreamContent(
  inputSnapshot: Record<string, unknown>,
  stageKey: string,
): string {
  const upstream = inputSnapshot.upstreamOutputs as
    | Record<string, { content?: string }>
    | undefined;
  if (!upstream?.[stageKey]?.content) return "";
  return upstream[stageKey].content ?? "";
}

function extractCollectionContextContent(
  inputSnapshot: Record<string, unknown>,
  stageKey: string,
): string {
  const ctx = inputSnapshot.collectionContextOutputs as
    | Record<string, { content?: string }>
    | undefined;
  if (!ctx?.[stageKey]?.content) return "";
  return ctx[stageKey].content ?? "";
}

const configs: Record<string, StagePromptConfig> = {
  // ─── Collection stages ────────────────────────────────────────────────────

  "collection-briefing": {
    systemPrompt:
      BASE_SYSTEM_PROMPT +
      `\n\nVocê está no estágio "collection-briefing". Sua tarefa é interpretar o briefing bruto da coleção e transformá-lo em uma direção criativa estruturada, já identificando os jogos mais adequados para o tema. NÃO peça informações ao usuário — use apenas os dados fornecidos.`,
    buildUserPrompt: (snap) => {
      const col = snap.collection as {
        name: string;
        briefing: string;
      } | null;
      return `Estágio: collection-briefing

Dados da coleção:
- Nome: ${col?.name ?? "N/A"}
- Briefing original: ${col?.briefing ?? "N/A"}

Interprete o briefing e selecione os jogos mais adequados. Retorne JSON com o schema:

{
  "collectionName": "string — nome da coleção",
  "originalBriefing": "string — briefing original",
  "interpretedTheme": "string — tema principal em uma frase",
  "targetAudience": "string — quem veste essas camisetas",
  "suggestedStyle": "string — direção estética geral",
  "keywords": ["string — 5 a 10 palavras-chave relevantes"],
  "selectedGames": [
    {
      "title": "string — nome do jogo",
      "platform": "string — plataforma(s) original(is)",
      "year": "number — ano de lançamento",
      "genre": "string — gênero do jogo",
      "relevance": "string — por que se encaixa no tema",
      "visualPotential": "string — elementos visuais extraíveis"
    }
  ],
  "suggestedDesignCount": "number — quantidade recomendada de itens de design",
  "notes": "string — observações adicionais para estágios downstream"
}`;
    },
    outputSchema: {
      collectionName: "string",
      originalBriefing: "string",
      interpretedTheme: "string",
      targetAudience: "string",
      suggestedStyle: "string",
      keywords: "string[]",
      selectedGames: "array of {title, platform, year, genre, relevance, visualPotential}",
      suggestedDesignCount: "number",
      notes: "string",
    },
  },

  "game-universe-extraction": {
    systemPrompt:
      BASE_SYSTEM_PROMPT +
      `\n\nVocê está no estágio "game-universe-extraction". Sua tarefa é extrair o universo visual e narrativo de cada jogo selecionado: personagens, cenários, objetos icônicos, paleta de cores e motivos visuais.`,
    buildUserPrompt: (snap) => {
      const briefingOutput = extractUpstreamContent(snap, "collection-briefing");
      const col = snap.collection as { name?: string } | null;
      return `Estágio: game-universe-extraction

Coleção: ${col?.name ?? "N/A"}

Resultado do estágio collection-briefing (inclui jogos selecionados):
${briefingOutput || "N/A"}

Para cada jogo, extraia o universo visual e narrativo completo. Retorne JSON com o schema:

{
  "universes": [
    {
      "gameTitle": "string",
      "characters": [
        { "name": "string", "description": "string", "visualTraits": ["string"] }
      ],
      "environments": ["string — locais/cenários icônicos"],
      "objects": ["string — itens, armas, power-ups icônicos"],
      "colorPalette": ["string — cores dominantes em hex ou nome descritivo"],
      "visualMotifs": ["string — padrões visuais recorrentes"],
      "mood": "string — tom emocional da identidade visual do jogo",
      "narrativeHooks": ["string — elementos narrativos com potencial visual"]
    }
  ]
}`;
    },
    outputSchema: {
      universes:
        "array of {gameTitle, characters[], environments[], objects[], colorPalette[], visualMotifs[], mood, narrativeHooks[]}",
    },
  },

  "visual-style-definition": {
    systemPrompt:
      BASE_SYSTEM_PROMPT +
      `\n\nVocê está no estágio "visual-style-definition". Sua tarefa é definir múltiplos estilos visuais nomeados para a coleção. Cada estilo é uma especificação completa de identidade visual que um item de design poderá usar. Gere entre 2 e 4 estilos distintos.`,
    buildUserPrompt: (snap) => {
      const universeOutput = extractUpstreamContent(snap, "game-universe-extraction");
      const col = snap.collection as { name?: string } | null;
      return `Estágio: visual-style-definition

Coleção: ${col?.name ?? "N/A"}

Universo dos jogos (do estágio game-universe-extraction):
${universeOutput || "N/A"}

Defina múltiplos estilos visuais distintos para esta coleção. Retorne JSON com o schema:

{
  "styles": [
    {
      "styleIndex": "number — índice 0-based",
      "styleName": "string — nome descritivo do estilo (ex: 'dark gothic', 'pixel art retrô')",
      "illustrationStyle": "string — ex: pixel art, flat design, hand-drawn, vector",
      "colorPalette": {
        "primary": ["string — cores hex"],
        "secondary": ["string — cores hex"],
        "accent": ["string — cores hex"]
      },
      "typography": {
        "style": "string — tipo de lettering",
        "weight": "string — bold, light, regular",
        "notes": "string"
      },
      "composition": "string — abordagem de layout",
      "detailLevel": "string — minimal, moderate, high detail",
      "textureNotes": "string",
      "references": ["string — inspirações visuais"]
    }
  ]
}`;
    },
    outputSchema: {
      styles:
        "array of {styleIndex, styleName, illustrationStyle, colorPalette, typography, composition, detailLevel, textureNotes, references}",
    },
  },

  // ─── Design item stages ───────────────────────────────────────────────────

  "composition-definition": {
    systemPrompt:
      BASE_SYSTEM_PROMPT +
      `\n\nVocê está no estágio "composition-definition". Sua tarefa é definir a composição completa de um item de design: conceito central, textos, layout físico na camiseta e restrições de produção. Use o contexto da coleção (briefing, universo, estilo visual selecionado) e o nome do item de design fornecido.`,
    buildUserPrompt: (snap) => {
      const briefingOutput = extractCollectionContextContent(snap, "collection-briefing");
      const universeOutput = extractCollectionContextContent(snap, "game-universe-extraction");
      const styleOutput = extractCollectionContextContent(snap, "visual-style-definition");
      const item = snap.designItem as { name?: string } | null;
      const styleIndex = snap.styleIndex as number | undefined;
      return `Estágio: composition-definition

Item de design: ${item?.name ?? "N/A"}

Briefing da coleção:
${briefingOutput || "N/A"}

Universo dos jogos:
${universeOutput || "N/A"}

Estilo visual selecionado (índice ${styleIndex ?? "N/A"}):
${styleOutput || "N/A"}

Defina a composição completa para este item. Retorne JSON com o schema:

{
  "conceptTitle": "string — título de trabalho deste design",
  "gameReference": "string — qual(is) jogo(s) este design usa como referência",
  "centralIdea": "string — conceito central em 1-2 frases",
  "visualElements": ["string — elementos visuais específicos a incluir"],
  "emotionalTone": "string — que sentimento o design deve evocar",
  "copy": {
    "primaryText": "string | null — texto/frase principal",
    "secondaryText": "string | null — texto de apoio",
    "languageStyle": "string — casual, gíria, trocadilho, etc."
  },
  "layout": {
    "printArea": "string — ex: full front, chest pocket, back panel",
    "dimensions": { "width": "string", "height": "string" },
    "hierarchy": ["string — do mais ao menos proeminente"],
    "textIntegration": "string"
  },
  "production": {
    "maxColors": "number",
    "resolution": "string — DPI mínimo",
    "fileFormat": "string",
    "colorMode": "string — CMYK, RGB",
    "shirtColors": ["string"],
    "printMethod": "string"
  }
}`;
    },
    outputSchema: {
      conceptTitle: "string",
      gameReference: "string",
      centralIdea: "string",
      visualElements: "string[]",
      emotionalTone: "string",
      copy: "{primaryText, secondaryText, languageStyle}",
      layout: "{printArea, dimensions, hierarchy, textIntegration}",
      production: "{maxColors, resolution, fileFormat, colorMode, shirtColors, printMethod}",
    },
  },

  "master-prompt-assembly": {
    systemPrompt:
      BASE_SYSTEM_PROMPT +
      `\n\nVocê está no estágio "master-prompt-assembly". Sua tarefa é sintetizar a composição definida no estágio anterior em um prompt completo e otimizado para geração de imagem via IA. O prompt mestre deve ser em inglês para melhor resultado com modelos de geração de imagem.`,
    buildUserPrompt: (snap) => {
      const compositionOutput = extractUpstreamContent(snap, "composition-definition");
      return `Estágio: master-prompt-assembly

Composição do design (do estágio composition-definition):
${compositionOutput || "N/A"}

Sintetize todos os dados acima em um prompt mestre para geração de imagem. Retorne JSON com o schema:

{
  "masterPrompt": "string — o prompt completo de geração de imagem, em INGLÊS, pronto para Imagen/DALL-E",
  "negativePrompt": "string — o que excluir da imagem gerada, em INGLÊS",
  "styleModifiers": ["string — keywords de estilo para adicionar ao prompt"],
  "generationParams": {
    "aspectRatio": "string — ex: 1:1, 3:4",
    "guidanceScale": "number — guidance scale sugerido",
    "numberOfVariations": "number — quantas variações gerar"
  },
  "qualityChecklist": ["string — critérios para avaliar as imagens geradas"]
}`;
    },
    outputSchema: {
      masterPrompt: "string",
      negativePrompt: "string",
      styleModifiers: "string[]",
      generationParams:
        "{aspectRatio: string, guidanceScale: number, numberOfVariations: number}",
      qualityChecklist: "string[]",
    },
  },

  "visual-variation-generation": {
    isImageGeneration: true,
    systemPrompt:
      BASE_SYSTEM_PROMPT +
      `\n\nVocê está no estágio "visual-variation-generation". Este estágio gera imagens reais usando o prompt mestre montado no estágio anterior.`,
    buildUserPrompt: (snap) => {
      const masterOutput = extractUpstreamContent(snap, "master-prompt-assembly");
      return `Estágio: visual-variation-generation

Prompt mestre (do estágio master-prompt-assembly):
${masterOutput || "N/A"}

Este estágio usa o masterPrompt para gerar imagens via ImageGenerationProvider.`;
    },
    outputSchema: {
      generatedImages:
        "array of {imageId, filePath, prompt, provider, model}",
      variationCount: "number",
      generationDuration: "number",
    },
  },
};

export function getStagePromptConfig(stageKey: string): StagePromptConfig {
  const config = configs[stageKey];
  if (!config) {
    throw new Error(`Unknown stage: "${stageKey}"`);
  }
  return config;
}
