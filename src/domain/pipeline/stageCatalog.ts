import { PipelineStage } from "./PipelineStage";

/**
 * stageCatalog is the official V1 pipeline definition (6 stages).
 * It is a static, ordered list of all pipeline stages.
 * Stages are never mutated at runtime.
 *
 * Stages 1–3 run at collection scope (shared context).
 * Stages 4–6 run at design_item scope (per design item).
 *
 * Design item stages declare `collectionDependencies` — collection stage keys
 * that must be present and approved in the DesignItem's collectionContext.
 */
export const stageCatalog: PipelineStage[] = [
  PipelineStage.create({
    key: "collection-briefing",
    name: "Briefing da Coleção",
    scope: "collection",
    order: 1,
    dependencies: [],
  }),
  PipelineStage.create({
    key: "game-universe-extraction",
    name: "Extração do Universo do Jogo",
    scope: "collection",
    order: 2,
    dependencies: ["collection-briefing"],
  }),
  PipelineStage.create({
    key: "visual-style-definition",
    name: "Definição de Estilo Visual",
    scope: "collection",
    order: 3,
    dependencies: ["game-universe-extraction"],
  }),
  PipelineStage.create({
    key: "composition-definition",
    name: "Definição de Composição",
    scope: "design_item",
    order: 4,
    dependencies: [],
    collectionDependencies: [
      "collection-briefing",
      "game-universe-extraction",
      "visual-style-definition",
    ],
  }),
  PipelineStage.create({
    key: "master-prompt-assembly",
    name: "Montagem do Prompt Mestre",
    scope: "design_item",
    order: 5,
    dependencies: ["composition-definition"],
  }),
  PipelineStage.create({
    key: "visual-variation-generation",
    name: "Geração de Variações Visuais",
    scope: "design_item",
    order: 6,
    dependencies: ["master-prompt-assembly"],
  }),
];
