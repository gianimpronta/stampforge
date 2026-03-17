import { v4 as uuidv4 } from "uuid";
import { DesignItem } from "../domain/design-items/DesignItem";
import type { DesignItemRepository } from "../domain/design-items/DesignItemRepository";

export interface CreateDesignItemInput {
  collectionId: string;
  name: string;
}

export interface CreateDesignItemDeps {
  designItemRepo: DesignItemRepository;
}

export async function createDesignItem(
  input: CreateDesignItemInput,
  deps: CreateDesignItemDeps,
): Promise<DesignItem> {
  const item = DesignItem.create({
    id: uuidv4(),
    collectionId: input.collectionId,
    name: input.name,
  });

  await deps.designItemRepo.save(item);

  return item;
}
