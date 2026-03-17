import { Collection } from "./Collection";

export interface CollectionRepository {
  save(collection: Collection): Promise<void>;
  findById(id: string): Promise<Collection | null>;
  findAll(): Promise<Collection[]>;
}
