export interface CollectionProps {
  id: string;
  name: string;
  briefing: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCollectionInput {
  id: string;
  name: string;
  briefing: string;
}

export class Collection {
  readonly id: string;
  readonly name: string;
  readonly briefing: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: CollectionProps) {
    this.id = props.id;
    this.name = props.name;
    this.briefing = props.briefing;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Reconstitutes a Collection from a persistence snapshot.
   * Bypasses validation — only use when loading from a trusted data store.
   */
  static reconstruct(props: CollectionProps): Collection {
    return new Collection(props);
  }

  static create(input: CreateCollectionInput): Collection {
    if (!input.id || input.id.trim() === "") {
      throw new Error("Collection id is required");
    }
    if (!input.name || input.name.trim() === "") {
      throw new Error("Collection name is required");
    }
    if (!input.briefing || input.briefing.trim() === "") {
      throw new Error("Collection briefing is required");
    }

    const now = new Date();
    return new Collection({
      id: input.id,
      name: input.name,
      briefing: input.briefing,
      createdAt: now,
      updatedAt: now,
    });
  }
}
