export type StageScope = "collection" | "design_item";

export interface PipelineStageProps {
  key: string;
  name: string;
  scope: StageScope;
  order: number;
  dependencies: string[];
}

export interface CreatePipelineStageInput {
  key: string;
  name: string;
  scope: StageScope;
  order: number;
  dependencies?: string[];
}

/**
 * PipelineStage is a STATIC DEFINITION (blueprint).
 * It describes what a stage is, its order, scope, and dependencies.
 * It never changes at runtime — it is part of the stage catalog.
 */
export class PipelineStage {
  readonly key: string;
  readonly name: string;
  readonly scope: StageScope;
  readonly order: number;
  readonly dependencies: string[];

  private constructor(props: PipelineStageProps) {
    this.key = props.key;
    this.name = props.name;
    this.scope = props.scope;
    this.order = props.order;
    this.dependencies = props.dependencies;
  }

  static create(input: CreatePipelineStageInput): PipelineStage {
    if (!input.key || input.key.trim() === "") {
      throw new Error("PipelineStage key is required");
    }
    if (!input.name || input.name.trim() === "") {
      throw new Error("PipelineStage name is required");
    }
    if (input.order < 1) {
      throw new Error("PipelineStage order must be a positive integer");
    }

    return new PipelineStage({
      key: input.key,
      name: input.name,
      scope: input.scope,
      order: input.order,
      dependencies: input.dependencies ?? [],
    });
  }
}
