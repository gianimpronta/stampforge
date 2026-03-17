# Pipeline Stage Scope Redesign

**Date:** 2026-03-17

## Context

The original V1 pipeline had 11 stages with a simple binary scope model (`collection` | `design_item`). After review, the pipeline was restructured to 6 stages with a richer cross-scope dependency model and support for multiple visual styles per collection.

## Pipeline — 6 Stages

| # | Stage Key | Name | Scope | Output |
|---|---|---|---|---|
| 1 | `collection-briefing` | Briefing da Coleção | collection | creative direction and game selection |
| 2 | `game-universe-extraction` | Extração do Universo do Jogo | collection | game lore, characters, themes |
| 3 | `visual-style-definition` | Definição de Estilo Visual | collection | N named visual styles |
| 4 | `composition-definition` | Definição de Composição | design_item | layout, copy, production constraints |
| 5 | `master-prompt-assembly` | Montagem do Prompt Mestre | design_item | consolidated generation prompt |
| 6 | `visual-variation-generation` | Geração de Variações Visuais | design_item | generated images |

### Stages removed from V1

- `game-selection` — merged into `collection-briefing`
- `design-concept` — removed (redundant with universe extraction + visual style)
- `theme-definition` — removed (redundant with design concept)
- `copy-generation` — absorbed into `composition-definition`
- `shirt-composition-definition` — merged into `composition-definition`
- `production-constraints-definition` — merged into `composition-definition`

## Collection Context on DesignItem

Each `DesignItem` holds a `collectionContext` field that maps collection stage keys to the specific execution the item uses as its base:

```ts
type CollectionContextEntry = {
  executionId: string;
  styleIndex?: number; // only for visual-style-definition
};

type CollectionContext = Partial<Record<string, CollectionContextEntry>>;
```

Example:

```json
{
  "collection-briefing":      { "executionId": "exec-001" },
  "game-universe-extraction": { "executionId": "exec-002" },
  "visual-style-definition":  { "executionId": "exec-003", "styleIndex": 2 }
}
```

### Rules

- The operator sets `collectionContext` before running any design item stage.
- If the operator updates any entry in `collectionContext` after design item stages have already executed, all downstream executions that depended on the changed entry become `stale`.
- `stale` executions must be re-executed before further downstream stages can run.
- A design item stage is only eligible to run if its cross-scope dependencies are satisfied (the referenced collection executions exist and are `approved`).

## Visual Style Definition — Multiple Styles per Execution

`visual-style-definition` is designed to produce multiple styles in a single execution. The output is a list of named style definitions (e.g., "dark gothic", "pixel art", "watercolor").

Each `DesignItem` selects one style from the execution via `styleIndex`. This allows a single collection execution to branch into multiple item clusters, each with a distinct visual identity.

## Cross-Scope Dependency Model

When a design item stage executes, it:

1. Reads the `collectionContext` from its `DesignItem`
2. Fetches the referenced collection execution(s)
3. Snapshots their outputs into its own `inputSnapshot`

The resulting `StageExecution` is fully self-contained. Historical reconstruction never requires re-fetching the collection's current state.

## Eligibility Rules

A design item stage is eligible to run when:

1. All its `design_item` upstream dependencies have an `approved` execution for the same item.
2. All its `collection` upstream dependencies are satisfied via `collectionContext` — the referenced execution exists and is `approved`.
3. No required `collectionContext` entry is missing.

## Stale Executions

When `collectionContext` is updated on a `DesignItem`:

1. The system identifies all `StageExecution` records for that item that directly or transitively depended on the changed entry.
2. Those executions are marked `stale`.
3. `stale` executions block their downstream stages from running until they are re-executed and re-approved.
4. The operator must explicitly re-run stale stages — the system never auto-advances.
