import { APIRequestContext } from "@playwright/test";

export interface Collection {
  id: string;
  name: string;
  briefing: string;
  createdAt: string;
}

export interface DesignItem {
  id: string;
  name: string;
  collectionId: string;
}

export interface StageExecution {
  id: string;
  stageKey: string;
  targetId: string;
  targetType: string;
  status: string;
  inputSnapshot: Record<string, unknown>;
  outputSnapshot: Record<string, unknown> | null;
  startedAt: string;
  completedAt: string | null;
}

export async function createTestCollection(
  request: APIRequestContext,
): Promise<Collection> {
  const uid = Date.now();
  const res = await request.post("/api/collections", {
    data: {
      name: `Col E2E ${uid}`,
      briefing: `Briefing de teste e2e ${uid}`,
    },
  });
  return res.json();
}

export async function createTestDesignItem(
  request: APIRequestContext,
  collectionId: string,
): Promise<DesignItem> {
  const uid = Date.now();
  const res = await request.post(`/api/collections/${collectionId}/design-items`, {
    data: { name: `Item E2E ${uid}` },
  });
  return res.json();
}

export async function triggerStage(
  request: APIRequestContext,
  stageKey: string,
  targetId: string,
): Promise<StageExecution> {
  const res = await request.post("/api/pipeline/trigger", {
    data: { stageKey, targetId },
  });
  return res.json();
}

export async function waitForExecutionStatus(
  request: APIRequestContext,
  executionId: string,
  targetStatus: string,
  opts?: { intervalMs?: number; timeoutMs?: number },
): Promise<void> {
  const intervalMs = opts?.intervalMs ?? 500;
  const timeoutMs = opts?.timeoutMs ?? 15_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await request.get(`/api/pipeline/executions/${executionId}`);
    if (res.ok()) {
      const exec = await res.json();
      if (exec.status === targetStatus) return;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(
    `Execução ${executionId} não atingiu status "${targetStatus}" em ${timeoutMs}ms`,
  );
}

export async function approveExecution(
  request: APIRequestContext,
  executionId: string,
): Promise<void> {
  await request.post(`/api/pipeline/executions/${executionId}/approve`, {
    data: { actorId: "operator" },
  });
}

export async function rejectExecution(
  request: APIRequestContext,
  executionId: string,
  reason: string,
): Promise<void> {
  await request.post(`/api/pipeline/executions/${executionId}/reject`, {
    data: { actorId: "operator", reason },
  });
}
