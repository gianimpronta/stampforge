import { PipelineStage } from "./PipelineStage";

/**
 * stageCatalog is the official V1 pipeline definition.
 * It is a static, ordered list of all pipeline stages.
 * Stages are never mutated at runtime.
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
    key: "game-selection",
    name: "Seleção do Jogo",
    scope: "collection",
    order: 2,
    dependencies: ["collection-briefing"],
  }),
  PipelineStage.create({
    key: "game-universe-extraction",
    name: "Extração do Universo do Jogo",
    scope: "collection",
    order: 3,
    dependencies: ["game-selection"],
  }),
  PipelineStage.create({
    key: "design-concept",
    name: "Conceito de Design",
    scope: "design_item",
    order: 4,
    dependencies: ["game-universe-extraction"],
  }),
  PipelineStage.create({
    key: "theme-definition",
    name: "Definição de Tema",
    scope: "design_item",
    order: 5,
    dependencies: ["design-concept"],
  }),
  PipelineStage.create({
    key: "visual-style-definition",
    name: "Definição de Estilo Visual",
    scope: "design_item",
    order: 6,
    dependencies: ["theme-definition"],
  }),
  PipelineStage.create({
    key: "copy-generation",
    name: "Geração de Texto",
    scope: "design_item",
    order: 7,
    dependencies: ["visual-style-definition"],
  }),
  PipelineStage.create({
    key: "shirt-composition-definition",
    name: "Definição de Composição da Camiseta",
    scope: "design_item",
    order: 8,
    dependencies: ["copy-generation"],
  }),
  PipelineStage.create({
    key: "production-constraints-definition",
    name: "Definição de Restrições de Produção",
    scope: "design_item",
    order: 9,
    dependencies: ["shirt-composition-definition"],
  }),
  PipelineStage.create({
    key: "master-prompt-assembly",
    name: "Montagem do Prompt Mestre",
    scope: "design_item",
    order: 10,
    dependencies: [
      "design-concept",
      "theme-definition",
      "visual-style-definition",
      "copy-generation",
      "shirt-composition-definition",
      "production-constraints-definition",
    ],
  }),
  PipelineStage.create({
    key: "visual-variation-generation",
    name: "Geração de Variações Visuais",
    scope: "design_item",
    order: 11,
    dependencies: ["master-prompt-assembly"],
  }),
];
