import { InMemoryCollectionRepository } from "../../infrastructure/db/repositories/InMemoryCollectionRepository";
import { InMemoryDesignItemRepository } from "../../infrastructure/db/repositories/InMemoryDesignItemRepository";
import { InMemoryStageExecutionRepository } from "../../infrastructure/db/repositories/InMemoryStageExecutionRepository";
import { InMemoryGeneratedImageRepository } from "../../infrastructure/db/repositories/InMemoryGeneratedImageRepository";

// Use globalThis to ensure a single shared instance across Next.js server
// components and API routes in dev mode (where module-level singletons
// get re-instantiated due to hot reload / separate workers).
const g = globalThis as Record<string, unknown>;

if (!g.__stampforge_collectionRepo) {
  g.__stampforge_collectionRepo = new InMemoryCollectionRepository();
}
if (!g.__stampforge_designItemRepo) {
  g.__stampforge_designItemRepo = new InMemoryDesignItemRepository();
}
if (!g.__stampforge_stageExecutionRepo) {
  g.__stampforge_stageExecutionRepo = new InMemoryStageExecutionRepository();
}
if (!g.__stampforge_generatedImageRepo) {
  g.__stampforge_generatedImageRepo = new InMemoryGeneratedImageRepository();
}

export const collectionRepo = g.__stampforge_collectionRepo as InMemoryCollectionRepository;
export const designItemRepo = g.__stampforge_designItemRepo as InMemoryDesignItemRepository;
export const stageExecutionRepo = g.__stampforge_stageExecutionRepo as InMemoryStageExecutionRepository;
export const generatedImageRepo = g.__stampforge_generatedImageRepo as InMemoryGeneratedImageRepository;
