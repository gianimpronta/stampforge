/**
 * Entry in a DesignItem's collection context.
 * References the specific collection StageExecution the item uses as its base.
 * `styleIndex` is only relevant for visual-style-definition, selecting one
 * of the N styles produced by that execution.
 */
export interface CollectionContextEntry {
  executionId: string;
  styleIndex?: number;
}

/**
 * Maps collection stage keys to the specific execution the design item uses.
 * Set by the operator before running any design_item stage.
 */
export type CollectionContext = Partial<Record<string, CollectionContextEntry>>;

export interface DesignItemProps {
  id: string;
  collectionId: string;
  name: string;
  collectionContext: CollectionContext;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDesignItemInput {
  id: string;
  collectionId: string;
  name: string;
}

export class DesignItem {
  readonly id: string;
  readonly collectionId: string;
  readonly name: string;
  readonly collectionContext: CollectionContext;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: DesignItemProps) {
    this.id = props.id;
    this.collectionId = props.collectionId;
    this.name = props.name;
    this.collectionContext = props.collectionContext;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Reconstitutes a DesignItem from a persistence snapshot.
   * Bypasses validation — only use when loading from a trusted data store.
   */
  static reconstruct(props: DesignItemProps): DesignItem {
    return new DesignItem(props);
  }

  static create(input: CreateDesignItemInput): DesignItem {
    if (!input.id || input.id.trim() === "") {
      throw new Error("DesignItem id is required");
    }
    if (!input.collectionId || input.collectionId.trim() === "") {
      throw new Error("DesignItem collectionId is required");
    }
    if (!input.name || input.name.trim() === "") {
      throw new Error("DesignItem name is required");
    }

    const now = new Date();
    return new DesignItem({
      id: input.id,
      collectionId: input.collectionId,
      name: input.name,
      collectionContext: {},
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Returns a new DesignItem with the collectionContext updated.
   * Does not validate that the referenced executions exist or are approved —
   * that is the responsibility of the application layer.
   */
  setCollectionContext(context: CollectionContext): DesignItem {
    return new DesignItem({
      ...this.toProps(),
      collectionContext: context,
      updatedAt: new Date(),
    });
  }

  private toProps(): DesignItemProps {
    return {
      id: this.id,
      collectionId: this.collectionId,
      name: this.name,
      collectionContext: this.collectionContext,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
