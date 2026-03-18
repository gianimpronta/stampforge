import { stageCatalog } from "./stageCatalog";
import type { CollectionContext } from "../design-items/DesignItem";

export interface IsStageReadyInput {
  stageKey: string;
  /** Approved same-scope stage keys for the target (collection or design item). */
  approvedStageKeys: string[];
  /**
   * Required for design_item stages that declare collectionDependencies.
   * The DesignItem's collectionContext mapping stage keys to execution entries.
   */
  collectionContext?: CollectionContext;
  /**
   * Set of approved collection execution IDs.
   * Used to verify that collectionContext entries reference approved executions.
   */
  approvedCollectionExecutionIds?: Set<string>;
}

/**
 * isStageReady checks whether a stage is eligible to be executed.
 *
 * A stage is ready when:
 * 1. All same-scope upstream dependencies have an approved execution.
 * 2. All collectionDependencies are satisfied via collectionContext:
 *    - The entry exists in collectionContext.
 *    - The referenced execution is in the approved set.
 *
 * Approval is distinct from completion: downstream stages require approved
 * executions, not merely completed ones.
 *
 * Throws if the stage key is not found in the catalog.
 */
export function isStageReady({
  stageKey,
  approvedStageKeys,
  collectionContext = {},
  approvedCollectionExecutionIds = new Set(),
}: IsStageReadyInput): boolean {
  const stage = stageCatalog.find((s) => s.key === stageKey);

  if (!stage) {
    throw new Error(`Stage not found in catalog: "${stageKey}"`);
  }

  const approvedSet = new Set(approvedStageKeys);

  const sameScopeDepsOk = stage.dependencies.every((dep) =>
    approvedSet.has(dep),
  );

  if (!sameScopeDepsOk) return false;

  if (stage.collectionDependencies.length === 0) return true;

  return stage.collectionDependencies.every((depKey) => {
    const entry = collectionContext[depKey];
    if (!entry) return false;
    return approvedCollectionExecutionIds.has(entry.executionId);
  });
}
