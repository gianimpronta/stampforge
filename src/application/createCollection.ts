import { v4 as uuidv4 } from "uuid";
import { Collection } from "../domain/collections/Collection";
import type { CollectionRepository } from "../domain/collections/CollectionRepository";

export interface CreateCollectionInput {
  name: string;
  briefing: string;
}

export interface CreateCollectionDeps {
  collectionRepo: CollectionRepository;
}

export async function createCollection(
  input: CreateCollectionInput,
  deps: CreateCollectionDeps,
): Promise<Collection> {
  const collection = Collection.create({
    id: uuidv4(),
    name: input.name,
    briefing: input.briefing,
  });

  await deps.collectionRepo.save(collection);

  return collection;
}
