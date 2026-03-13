export interface DesignItemProps {
  id: string;
  collectionId: string;
  name: string;
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
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: DesignItemProps) {
    this.id = props.id;
    this.collectionId = props.collectionId;
    this.name = props.name;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
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
      createdAt: now,
      updatedAt: now,
    });
  }
}
