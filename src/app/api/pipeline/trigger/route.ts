import { NextRequest, NextResponse } from "next/server";
import { runStageExecution } from "../../../../application/runStageExecution";
import {
  stageExecutionRepo,
  collectionRepo,
  designItemRepo,
} from "../../../../lib/server/dependencies";

/**
 * POST /api/pipeline/trigger
 * Body: { stageKey: string, targetId: string }
 *
 * Executa um estágio do pipeline diretamente (sem fila, para V1).
 * Requer que as dependências upstream estejam aprovadas.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { stageKey, targetId } = body as Record<string, unknown>;

  if (!stageKey || typeof stageKey !== "string") {
    return NextResponse.json({ error: "stageKey is required" }, { status: 400 });
  }
  if (!targetId || typeof targetId !== "string") {
    return NextResponse.json({ error: "targetId is required" }, { status: 400 });
  }

  try {
    const execution = await runStageExecution({
      stageKey,
      targetId,
      deps: {
        executionRepo: stageExecutionRepo,
        collectionRepo,
        designItemRepo,
        // LLM provider is not wired in V1 for in-process execution; using a no-op stub.
        llm: {
          generateText: async (_input) => ({
            content: `[stub] stage ${stageKey} executed for target ${targetId}`,
            provider: "stub",
            model: "stub",
          }),
        },
      },
    });

    return NextResponse.json(execution, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
