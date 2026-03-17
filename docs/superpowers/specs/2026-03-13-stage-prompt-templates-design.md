# Stage Prompt Templates Design

## Context

The StampForge pipeline has 11 stages, each currently using a generic prompt that produces inconsistent, off-topic outputs. The LLM sometimes returns questionnaires instead of processing the provided data. Each stage needs a specific prompt template with a rigid JSON output schema so that downstream stages can consume outputs programmatically and the UI can render structured data.

The pipeline theme is always **games** (jogos) in V1.

## Goals

- Define a rigid JSON output schema per stage
- Write specific prompt instructions per stage that consume upstream outputs
- Ensure the LLM processes input data instead of asking questions
- Support programmatic downstream consumption of stage outputs
- Handle stage 11 differently (image generation via Imagen, not text LLM)

## Non-Goals

- Generic/multi-theme pipeline support
- JSON Schema validation at runtime (future improvement)
- Prompt versioning or A/B testing

## Architecture

### Module: `src/domain/pipeline/stagePrompts.ts`

Single module exporting:

```typescript
interface StagePromptConfig {
  systemPrompt: string;
  buildUserPrompt: (inputSnapshot: Record<string, unknown>) => string;
  outputSchema: Record<string, unknown>; // JSON schema description for the LLM
}

function getStagePromptConfig(stageKey: string): StagePromptConfig;
```

### Shared System Prompt

All stages share a base system prompt:

```
Você é um especialista em criação de coleções de camisetas temáticas baseadas em jogos.

Regras obrigatórias:
- Responda APENAS com JSON válido, sem markdown, sem blocos de código, sem texto adicional.
- Siga exatamente o schema de saída especificado.
- Use os dados de entrada fornecidos. NÃO faça perguntas ao usuário.
- Todos os textos em português brasileiro, exceto termos técnicos.
```

Each stage appends its specific instructions after this base.

### Integration Point

Replace the current `buildPrompt` function in `runStageExecution.ts` with a call to `getStagePromptConfig(stageKey)`, then pass `systemPrompt` and `userPrompt` separately to the LLM provider.

The `LLMProvider.generateText` interface already supports `systemPrompt` via the `LLMRequest` type.

For stage 11 (`visual-variation-generation`), the execution flow changes: instead of calling `llm.generateText()`, it calls `ImageGenerationProvider.generateImages()` using the master prompt from stage 10.

## Stage Schemas

### Stage 1: `collection-briefing`

**Input:** Collection name and briefing text.
**Purpose:** Interpret the raw briefing into structured creative direction.

```json
{
  "collectionName": "string",
  "originalBriefing": "string",
  "interpretedTheme": "string — main theme in one sentence",
  "targetAudience": "string — who wears these shirts",
  "suggestedStyle": "string — overall aesthetic direction",
  "keywords": ["string — 5-10 relevant keywords"],
  "suggestedDesignCount": "number — recommended number of design items",
  "notes": "string — additional observations for downstream stages"
}
```

### Stage 2: `game-selection`

**Input:** Interpreted briefing from stage 1.
**Purpose:** Select specific games that fit the collection theme.

```json
{
  "games": [
    {
      "title": "string — game name",
      "platform": "string — original platform(s)",
      "year": "number — release year",
      "genre": "string — game genre",
      "relevance": "string — why this game fits the collection theme",
      "visualPotential": "string — what visual elements can be extracted"
    }
  ],
  "selectionRationale": "string — overall reasoning for the selection"
}
```

### Stage 3: `game-universe-extraction`

**Input:** Selected games from stage 2.
**Purpose:** Extract visual universe elements from each selected game.

```json
{
  "universes": [
    {
      "gameTitle": "string",
      "characters": [
        {
          "name": "string",
          "description": "string",
          "visualTraits": ["string"]
        }
      ],
      "environments": ["string — iconic locations/scenarios"],
      "objects": ["string — iconic items, weapons, power-ups"],
      "colorPalette": ["string — dominant colors as hex or descriptive names"],
      "visualMotifs": ["string — recurring visual patterns or symbols"],
      "mood": "string — emotional tone of the game's visual identity"
    }
  ]
}
```

### Stage 4: `design-concept`

**Input:** Game universe extraction from stage 3, plus the design item context.
**Purpose:** Define the central concept for one specific design item.

```json
{
  "conceptTitle": "string — working title for this design",
  "gameReference": "string — which game(s) this concept draws from",
  "centralIdea": "string — the core concept in 1-2 sentences",
  "visualReferences": ["string — specific visual elements to include"],
  "emotionalTone": "string — what feeling the design should evoke",
  "targetPlacement": "string — front, back, pocket, all-over",
  "differentiator": "string — what makes this design unique in the collection"
}
```

### Stage 5: `theme-definition`

**Input:** Design concept from stage 4.
**Purpose:** Expand the concept into a detailed theme with narrative and mood.

```json
{
  "themeName": "string — the theme's name",
  "narrative": "string — the story or message behind the design",
  "mood": "string — detailed emotional atmosphere",
  "tone": "string — playful, serious, nostalgic, ironic, etc.",
  "culturalReferences": ["string — cultural touchpoints beyond the game itself"],
  "avoidList": ["string — things to explicitly avoid in this design"]
}
```

### Stage 6: `visual-style-definition`

**Input:** Theme definition from stage 5.
**Purpose:** Define the complete visual style specification.

```json
{
  "illustrationStyle": "string — e.g. pixel art, flat design, hand-drawn, vector",
  "colorPalette": {
    "primary": ["string — hex colors"],
    "secondary": ["string — hex colors"],
    "accent": ["string — hex colors"]
  },
  "typography": {
    "style": "string — type of lettering if any text is included",
    "weight": "string — bold, light, regular",
    "notes": "string — additional typography guidance"
  },
  "composition": "string — general layout approach",
  "detailLevel": "string — minimal, moderate, high detail",
  "textureNotes": "string — any texture or finish considerations",
  "references": ["string — visual style references or inspirations"]
}
```

### Stage 7: `copy-generation`

**Input:** Theme definition + visual style from stages 5-6.
**Purpose:** Generate text content for the shirt design.

```json
{
  "primaryText": "string — main text/phrase for the shirt (if applicable)",
  "secondaryText": "string | null — supporting text or tagline",
  "textPlacement": "string — where text should appear relative to the design",
  "languageStyle": "string — formal, casual, slang, pun-based, etc.",
  "alternatives": [
    {
      "text": "string",
      "rationale": "string — why this alternative works"
    }
  ],
  "noTextOption": "boolean — whether a text-free version is also viable"
}
```

### Stage 8: `shirt-composition-definition`

**Input:** Visual style + copy from stages 6-7.
**Purpose:** Define the physical layout of the design on the shirt.

```json
{
  "printArea": "string — e.g. full front, chest pocket area, back panel, sleeve",
  "dimensions": {
    "width": "string — approximate width in cm",
    "height": "string — approximate height in cm"
  },
  "layout": {
    "description": "string — how elements are arranged",
    "hierarchy": ["string — ordered from most to least prominent element"],
    "textIntegration": "string — how text relates to graphic elements"
  },
  "shirtColors": ["string — recommended base shirt colors"],
  "printMethod": "string — DTG, screen print, sublimation, etc."
}
```

### Stage 9: `production-constraints-definition`

**Input:** Shirt composition from stage 8.
**Purpose:** Define technical production constraints.

```json
{
  "maxColors": "number — maximum number of distinct colors",
  "resolution": "string — minimum DPI",
  "fileFormat": "string — PNG, SVG, AI, etc.",
  "bleed": "string — bleed area specification",
  "printableArea": {
    "maxWidth": "string — in cm",
    "maxHeight": "string — in cm"
  },
  "colorMode": "string — CMYK, RGB, spot colors",
  "fabricConsiderations": "string — how fabric type affects the design",
  "specialNotes": "string — any additional production requirements"
}
```

### Stage 10: `master-prompt-assembly`

**Input:** All upstream outputs (stages 4-9).
**Purpose:** Assemble a complete, optimized image generation prompt.

```json
{
  "masterPrompt": "string — the complete image generation prompt ready for Imagen",
  "negativePrompt": "string — what to exclude from the generated image",
  "styleModifiers": ["string — style keywords to append"],
  "generationParams": {
    "aspectRatio": "string — e.g. 1:1, 3:4",
    "guidanceScale": "number — suggested guidance scale",
    "numberOfVariations": "number — how many variations to generate"
  },
  "qualityChecklist": ["string — criteria for evaluating generated images"]
}
```

### Stage 11: `visual-variation-generation`

**Input:** Master prompt from stage 10.
**Purpose:** Generate actual images using the Imagen provider.

This stage does NOT use the text LLM. Instead:

1. Extract `masterPrompt` and `generationParams` from stage 10 output
2. Call `ImageGenerationProvider.generateImages()` with the master prompt
3. Store generated images via `AssetStorage`
4. Create `GeneratedImage` records with full traceability

```json
{
  "generatedImages": [
    {
      "imageId": "string — UUID of the GeneratedImage record",
      "filePath": "string — storage path",
      "prompt": "string — the exact prompt used",
      "provider": "string",
      "model": "string"
    }
  ],
  "variationCount": "number",
  "generationDuration": "number — seconds"
}
```

## Changes Required

### 1. New file: `src/domain/pipeline/stagePrompts.ts`
- Export `getStagePromptConfig(stageKey): StagePromptConfig`
- Contains all 11 stage prompt configurations

### 2. Modify: `src/domain/providers/LLMProvider.ts`
- Ensure `LLMRequest` includes `systemPrompt` field (already exists)

### 3. Modify: `src/application/runStageExecution.ts`
- Replace `buildPrompt()` with `getStagePromptConfig()` call
- Pass `systemPrompt` and user prompt separately to LLM
- For stage 11: branch to image generation flow instead of LLM call

### 4. Modify: `src/application/runStageExecution.ts` dependencies
- Add `ImageGenerationProvider` and `AssetStorage` as optional deps (only needed for stage 11)

## Testing Strategy

- Unit test: verify each `getStagePromptConfig()` returns valid config with non-empty prompts
- Integration test: run stages 1-3 via curl against real Gemini and validate output structure
- Manual verification: inspect quality of outputs through the pipeline UI
