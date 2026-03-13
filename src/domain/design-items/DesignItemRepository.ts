import { DesignItem } from "./DesignItem";

export interface DesignItemRepository {
  save(item: DesignItem): Promise<void>;
  findById(id: string): Promise<DesignItem | null>;
  findByCollectionId(collectionId: string): Promise<DesignItem[]>;
}
