import { DesignItem } from "../../../domain/design-items/DesignItem";
import { DesignItemRepository } from "../../../domain/design-items/DesignItemRepository";

export class InMemoryDesignItemRepository implements DesignItemRepository {
  private store = new Map<string, DesignItem>();

  async save(item: DesignItem): Promise<void> {
    this.store.set(item.id, item);
  }

  async findById(id: string): Promise<DesignItem | null> {
    return this.store.get(id) ?? null;
  }

  async findByCollectionId(collectionId: string): Promise<DesignItem[]> {
    return Array.from(this.store.values()).filter(
      (item) => item.collectionId === collectionId,
    );
  }
}
