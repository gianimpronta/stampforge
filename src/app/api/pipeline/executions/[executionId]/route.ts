import { NextRequest, NextResponse } from "next/server";
import { stageExecutionRepo } from "../../../../../lib/server/dependencies";

/**
 * GET /api/pipeline/executions/[executionId]
 * Retorna os detalhes de uma execução de estágio pelo ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> },
) {
  const { executionId } = await params;

  const execution = await stageExecutionRepo.findById(executionId);
  if (!execution) {
    return NextResponse.json(
      { error: `StageExecution not found: "${executionId}"` },
      { status: 404 },
    );
  }

  return NextResponse.json(execution);
}
