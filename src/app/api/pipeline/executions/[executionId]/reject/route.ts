import { NextRequest, NextResponse } from "next/server";
import { rejectStageExecution } from "../../../../../../application/rejectStageExecution";
import { stageExecutionRepo } from "../../../../../../lib/server/dependencies";

/**
 * POST /api/pipeline/executions/[executionId]/reject
 * Body: { actorId: string, reason: string }
 *
 * Rejeita uma execução de estágio que esteja no status "completed".
 * Rejeição representa desacordo humano, não falha técnica.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> },
) {
  const { executionId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { actorId, reason } = body as Record<string, unknown>;

  if (!actorId || typeof actorId !== "string") {
    return NextResponse.json({ error: "actorId is required" }, { status: 400 });
  }
  if (!reason || typeof reason !== "string") {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  try {
    const rejected = await rejectStageExecution(
      { executionId, actorId, reason },
      { stageExecutionRepo },
    );
    return NextResponse.json(rejected);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("not found") ? 404 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
