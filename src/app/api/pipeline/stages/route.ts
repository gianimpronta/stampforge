import { NextResponse } from "next/server";
import { stageCatalog } from "../../../../domain/pipeline/stageCatalog";

/**
 * GET /api/pipeline/stages
 * Retorna o catálogo completo de estágios do pipeline V1.
 */
export async function GET() {
  const stages = stageCatalog.map((stage) => ({
    key: stage.key,
    name: stage.name,
    scope: stage.scope,
    order: stage.order,
    dependencies: stage.dependencies,
  }));

  return NextResponse.json(stages);
}
