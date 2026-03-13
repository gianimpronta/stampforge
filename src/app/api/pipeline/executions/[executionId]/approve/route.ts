import { NextRequest, NextResponse } from "next/server";
import { approveStageExecution } from "../../../../../../application/approveStageExecution";
import { stageExecutionRepo } from "../../../../../../lib/server/dependencies";

/**
 * POST /api/pipeline/executions/[executionId]/approve
 * Body: { actorId: string }
 *
 * Aprova uma execução de estágio que esteja no status "completed".
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

  const { actorId } = body as Record<string, unknown>;

  if (!actorId || typeof actorId !== "string") {
    return NextResponse.json({ error: "actorId is required" }, { status: 400 });
  }

  try {
    const approved = await approveStageExecution(
      { executionId, actorId },
      { stageExecutionRepo },
    );
    return NextResponse.json(approved);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("not found") ? 404 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
