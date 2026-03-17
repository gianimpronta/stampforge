import { NextRequest, NextResponse } from "next/server";
import { getPipelineTimeline } from "../../../../../application/getPipelineTimeline";
import { stageExecutionRepo } from "../../../../../lib/server/dependencies";

/**
 * GET /api/pipeline/timeline/[targetId]
 * Retorna todas as execuções de estágio para um alvo (collection ou design item),
 * em ordem cronológica de início.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ targetId: string }> },
) {
  const { targetId } = await params;

  const timeline = await getPipelineTimeline(
    { targetId },
    { stageExecutionRepo },
  );

  return NextResponse.json(timeline);
}
