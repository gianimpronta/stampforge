import { stageCatalog } from "./stageCatalog";

export interface IsStageReadyInput {
  stageKey: string;
  approvedStageKeys: string[];
}

/**
 * isStageReady checks whether a stage is eligible to be executed.
 * A stage is ready when all its upstream dependencies have been approved.
 *
 * Approval is distinct from completion: downstream stages require approved
 * executions, not merely completed ones.
 *
 * Throws if the stage key is not found in the catalog.
 */
export function isStageReady({
  stageKey,
  approvedStageKeys,
}: IsStageReadyInput): boolean {
  const stage = stageCatalog.find((s) => s.key === stageKey);

  if (!stage) {
    throw new Error(`Stage not found in catalog: "${stageKey}"`);
  }

  if (stage.dependencies.length === 0) {
    return true;
  }

  const approvedSet = new Set(approvedStageKeys);

  return stage.dependencies.every((dep) => approvedSet.has(dep));
}
