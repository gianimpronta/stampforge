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

function formatUpstreamOutputs(
  inputSnapshot: Record<string, unknown>,
): string {
  const upstream = inputSnapshot.upstreamOutputs as
    | Record<string, { content?: string }>
    | undefined;
  if (!upstream) return "";
  return Object.entries(upstream)
    .map(([key, val]) => `### ${key}\n${val.content ?? "N/A"}`)
    .join("\n\n");
}

const configs: Record<string, StagePromptConfig> = {
  "collection-briefing": {
    systemPrompt:
      BASE_SYSTEM_PROMPT +
      `\n\nVocê está no estágio "collection-briefing". Sua tarefa é interpretar o briefing bruto da coleção e transformá-lo em uma direção criativa estruturada. NÃO peça informações ao usuário — use apenas os dados fornecidos.`,
    buildUserPrompt: (snap) => {
      const col = snap.collection as {
        name: string;
        briefing: string;
      } | null;
      return `Estágio: collection-briefing

Dados da coleção:
- Nome: ${col?.name ?? "N/A"}
- Briefing original: ${col?.briefing ?? "N/A"}

Interprete o briefing acima e retorne um JSON com o seguinte schema:

{
  "collectionName": "string — nome da coleção",
  "originalBriefing": "string — briefing original",
  "interpretedTheme": "string — tema principal em uma frase",
  "targetAudience": "string — quem veste essas camisetas",
  "suggestedStyle": "string — direção estética geral",
  "keywords": ["string — 5 a 10 palavras-chave relevantes"],
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
      suggestedDesignCount: "number",
      notes: "string",
    },
  },

  "game-selection": {
    systemPrompt:
      BASE_SYSTEM_PROMPT +
      `\n\nVocê está no estágio "game-selection". Sua tarefa é selecionar jogos específicos que se encaixam na direção criativa da coleção. Baseie-se no briefing interpretado do estágio anterior.`,
    buildUserPrompt: (snap) => {
      const briefingOutput = extractUpstreamContent(snap, "collection-briefing");
      const col = snap.collection as { name?: string; briefing?: string } | null;
      return `Estágio: game-selection

Coleção: ${col?.name ?? "N/A"}
Briefing original: ${col?.briefing ?? "N/A"}

Resultado do estágio collection-briefing:
${briefingOutput || "N/A"}

Selecione jogos que se encaixam nesta coleção. Retorne JSON com o schema:

{
  "games": [
    {
      "title": "string — nome do jogo",
      "platform": "string — plataforma(s) original(is)",
      "year": "number — ano de lançamento",
      "genre": "string — gênero do jogo",
      "relevance": "string — por que este jogo se encaixa na coleção",
      "visualPotential": "string — que elementos visuais podem ser extraídos"
    }
  ],
  "selectionRationale": "string — raciocínio geral da seleção"
}`;
    },
    outputSchema: {
      games: "array of {title, platform, year, genre, relevance, visualPotential}",
      selectionRationale: "string",
    },
  },

  "game-universe-extraction": {
    systemPrompt:
      BASE_SYSTEM_PROMPT +
      `\n\nVocê está no estágio "game-universe-extraction". Sua tarefa é extrair o universo visual de cada jogo selecionado: personagens, cenários, objetos, paleta de cores e motivos visuais.`,
    buildUserPrompt: (snap) => {
      const gameSelectionOutput = extractUpstreamContent(snap, "game-selection");
      return `Estágio: game-universe-extraction

Jogos selecionados (do estágio game-selection):
${gameSelectionOutput || "N/A"}

Para cada jogo, extraia o universo visual completo. Retorne JSON com o schema:

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
      "mood": "string — tom emocional da identidade visual do jogo"
    }
  ]
}`;
    },
    outputSchema: {
      universes:
        "array of {gameTitle, characters[], environments[], objects[], colorPalette[], visualMotifs[], mood}",
    },
  },

  "design-concept": {
    systemPrompt:
      BASE_SYSTEM_PROMPT +
      `\n\nVocê está no estágio "design-concept". Sua tarefa é definir o conceito central para um item de design específico, baseando-se no universo dos jogos extraído anteriormente.`,
    buildUserPrompt: (snap) => {
      const universeOutput = extractUpstreamContent(
        snap,
        "game-universe-extraction",
      );
      const item = snap.designItem as {
        name?: string;
        collectionId?: string;
      } | null;
      return `Estágio: design-concept

Item de design: ${item?.name ?? "N/A"}

Universo dos jogos (do estágio game-universe-extraction):
${universeOutput || "N/A"}

Defina o conceito central para este item de design. Retorne JSON com o schema:

{
  "conceptTitle": "string — título de trabalho deste design",
  "gameReference": "string — qual(is) jogo(s) este conceito usa como referência",
  "centralIdea": "string — o conceito central em 1-2 frases",
  "visualReferences": ["string — elementos visuais específicos a incluir"],
  "emotionalTone": "string — que sentimento o design deve evocar",
  "targetPlacement": "string — frente, costas, bolso, all-over",
  "differentiator": "string — o que torna este design único na coleção"
}`;
    },
    outputSchema: {
      conceptTitle: "string",
      gameReference: "string",
      centralIdea: "string",
      visualReferences: "string[]",
      emotionalTone: "string",
      targetPlacement: "string",
      differentiator: "string",
    },
  },

  "theme-definition": {
    systemPrompt:
      BASE_SYSTEM_PROMPT +
      `\n\nVocê está no estágio "theme-definition". Sua tarefa é expandir o conceito de design em um tema detalhado com narrativa, mood e tom.`,
    buildUserPrompt: (snap) => {
      const conceptOutput = extractUpstreamContent(snap, "design-concept");
      return `Estágio: theme-definition

Conceito de design (do estágio design-concept):
${conceptOutput || "N/A"}

Expanda o conceito em um tema detalhado. Retorne JSON com o schema:

{
  "themeName": "string — nome do tema",
  "narrative": "string — a história ou mensagem por trás do design",
  "mood": "string — atmosfera emocional detalhada",
  "tone": "string — brincalhão, sério, nostálgico, irônico, etc.",
  "culturalReferences": ["string — referências culturais além do jogo em si"],
  "avoidList": ["string — coisas a evitar explicitamente neste design"]
}`;
    },
    outputSchema: {
      themeName: "string",
      narrative: "string",
      mood: "string",
      tone: "string",
      culturalReferences: "string[]",
      avoidList: "string[]",
    },
  },

  "visual-style-definition": {
    systemPrompt:
      BASE_SYSTEM_PROMPT +
      `\n\nVocê está no estágio "visual-style-definition". Sua tarefa é definir a especificação completa de estilo visual para o design, incluindo paleta, tipografia e estilo de ilustração.`,
    buildUserPrompt: (snap) => {
      const themeOutput = extractUpstreamContent(snap, "theme-definition");
      return `Estágio: visual-style-definition

Tema (do estágio theme-definition):
${themeOutput || "N/A"}

Defina o estilo visual completo. Retorne JSON com o schema:

{
  "illustrationStyle": "string — ex: pixel art, flat design, hand-drawn, vector",
  "colorPalette": {
    "primary": ["string — cores hex"],
    "secondary": ["string — cores hex"],
    "accent": ["string — cores hex"]
  },
  "typography": {
    "style": "string — tipo de lettering se houver texto",
    "weight": "string — bold, light, regular",
    "notes": "string — orientações adicionais de tipografia"
  },
  "composition": "string — abordagem geral de layout",
  "detailLevel": "string — minimal, moderate, high detail",
  "textureNotes": "string — considerações de textura ou acabamento",
  "references": ["string — referências visuais ou inspirações"]
}`;
    },
    outputSchema: {
      illustrationStyle: "string",
      colorPalette: "{primary: string[], secondary: string[], accent: string[]}",
      typography: "{style: string, weight: string, notes: string}",
      composition: "string",
      detailLevel: "string",
      textureNotes: "string",
      references: "string[]",
    },
  },

  "copy-generation": {
    systemPrompt:
      BASE_SYSTEM_PROMPT +
      `\n\nVocê está no estágio "copy-generation". Sua tarefa é gerar textos e frases para a camiseta baseados no tema e estilo visual definidos.`,
    buildUserPrompt: (snap) => {
      const themeOutput = extractUpstreamContent(snap, "theme-definition");
      const styleOutput = extractUpstreamContent(
        snap,
        "visual-style-definition",
      );
      return `Estágio: copy-generation

Tema (do estágio theme-definition):
${themeOutput || "N/A"}

Estilo visual (do estágio visual-style-definition):
${styleOutput || "N/A"}

Gere textos para a camiseta. Retorne JSON com o schema:

{
  "primaryText": "string — texto/frase principal da camiseta (se aplicável)",
  "secondaryText": "string | null — texto de apoio ou tagline",
  "textPlacement": "string — onde o texto aparece em relação ao design",
  "languageStyle": "string — formal, casual, gíria, trocadilho, etc.",
  "alternatives": [
    { "text": "string", "rationale": "string — por que esta alternativa funciona" }
  ],
  "noTextOption": "boolean — se uma versão sem texto também é viável"
}`;
    },
    outputSchema: {
      primaryText: "string",
      secondaryText: "string | null",
      textPlacement: "string",
      languageStyle: "string",
      alternatives: "array of {text, rationale}",
      noTextOption: "boolean",
    },
  },

  "shirt-composition-definition": {
    systemPrompt:
      BASE_SYSTEM_PROMPT +
      `\n\nVocê está no estágio "shirt-composition-definition". Sua tarefa é definir o layout físico do design na camiseta, incluindo área de impressão, dimensões e hierarquia visual.`,
    buildUserPrompt: (snap) => {
      const styleOutput = extractUpstreamContent(
        snap,
        "visual-style-definition",
      );
      const copyOutput = extractUpstreamContent(snap, "copy-generation");
      return `Estágio: shirt-composition-definition

Estilo visual (do estágio visual-style-definition):
${styleOutput || "N/A"}

Textos (do estágio copy-generation):
${copyOutput || "N/A"}

Defina a composição da camiseta. Retorne JSON com o schema:

{
  "printArea": "string — ex: full front, chest pocket area, back panel, sleeve",
  "dimensions": {
    "width": "string — largura aproximada em cm",
    "height": "string — altura aproximada em cm"
  },
  "layout": {
    "description": "string — como os elementos são arranjados",
    "hierarchy": ["string — do mais ao menos proeminente"],
    "textIntegration": "string — como texto se relaciona com elementos gráficos"
  },
  "shirtColors": ["string — cores de camiseta recomendadas"],
  "printMethod": "string — DTG, serigrafia, sublimação, etc."
}`;
    },
    outputSchema: {
      printArea: "string",
      dimensions: "{width: string, height: string}",
      layout: "{description: string, hierarchy: string[], textIntegration: string}",
      shirtColors: "string[]",
      printMethod: "string",
    },
  },

  "production-constraints-definition": {
    systemPrompt:
      BASE_SYSTEM_PROMPT +
      `\n\nVocê está no estágio "production-constraints-definition". Sua tarefa é definir as restrições técnicas de produção para o design.`,
    buildUserPrompt: (snap) => {
      const compositionOutput = extractUpstreamContent(
        snap,
        "shirt-composition-definition",
      );
      return `Estágio: production-constraints-definition

Composição da camiseta (do estágio shirt-composition-definition):
${compositionOutput || "N/A"}

Defina as restrições de produção. Retorne JSON com o schema:

{
  "maxColors": "number — número máximo de cores distintas",
  "resolution": "string — DPI mínimo",
  "fileFormat": "string — PNG, SVG, AI, etc.",
  "bleed": "string — especificação de sangria",
  "printableArea": {
    "maxWidth": "string — em cm",
    "maxHeight": "string — em cm"
  },
  "colorMode": "string — CMYK, RGB, spot colors",
  "fabricConsiderations": "string — como o tipo de tecido afeta o design",
  "specialNotes": "string — requisitos adicionais de produção"
}`;
    },
    outputSchema: {
      maxColors: "number",
      resolution: "string",
      fileFormat: "string",
      bleed: "string",
      printableArea: "{maxWidth: string, maxHeight: string}",
      colorMode: "string",
      fabricConsiderations: "string",
      specialNotes: "string",
    },
  },

  "master-prompt-assembly": {
    systemPrompt:
      BASE_SYSTEM_PROMPT +
      `\n\nVocê está no estágio "master-prompt-assembly". Sua tarefa é sintetizar TODOS os outputs anteriores em um prompt completo e otimizado para geração de imagem via IA. O prompt mestre deve ser em inglês para melhor resultado com modelos de geração de imagem.`,
    buildUserPrompt: (snap) => {
      const upstreamText = formatUpstreamOutputs(snap);
      return `Estágio: master-prompt-assembly

Outputs de todos os estágios anteriores:
${upstreamText || "N/A"}

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
      const masterOutput = extractUpstreamContent(
        snap,
        "master-prompt-assembly",
      );
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
