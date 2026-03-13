import { InMemoryCollectionRepository } from "../../infrastructure/db/repositories/InMemoryCollectionRepository";
import { InMemoryDesignItemRepository } from "../../infrastructure/db/repositories/InMemoryDesignItemRepository";

// Singleton in-memory repositories shared across the app process.
// These will be replaced with Postgres-backed implementations in Task 20.
export const collectionRepo = new InMemoryCollectionRepository();
export const designItemRepo = new InMemoryDesignItemRepository();
