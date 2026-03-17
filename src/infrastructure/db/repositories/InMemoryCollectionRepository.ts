import { Collection } from "../../../domain/collections/Collection";
import { CollectionRepository } from "../../../domain/collections/CollectionRepository";

export class InMemoryCollectionRepository implements CollectionRepository {
  private readonly store = new Map<string, Collection>();

  async save(collection: Collection): Promise<void> {
    this.store.set(collection.id, collection);
  }

  async findById(id: string): Promise<Collection | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<Collection[]> {
    return Array.from(this.store.values());
  }
}
