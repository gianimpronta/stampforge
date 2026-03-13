import { InMemoryCollectionRepository } from "../../infrastructure/db/repositories/InMemoryCollectionRepository";
import { InMemoryDesignItemRepository } from "../../infrastructure/db/repositories/InMemoryDesignItemRepository";
import { InMemoryStageExecutionRepository } from "../../infrastructure/db/repositories/InMemoryStageExecutionRepository";

// Singleton in-memory repositories shared across the app process.
// These will be replaced with Postgres-backed implementations in Task 20.
export const collectionRepo = new InMemoryCollectionRepository();
export const designItemRepo = new InMemoryDesignItemRepository();
export const stageExecutionRepo = new InMemoryStageExecutionRepository();
