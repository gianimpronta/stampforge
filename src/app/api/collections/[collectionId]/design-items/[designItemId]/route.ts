import { NextRequest, NextResponse } from "next/server";
import { designItemRepo } from "../../../../../../lib/server/dependencies";

/**
 * GET /api/collections/[collectionId]/design-items/[designItemId]
 * Retorna um item de design pelo ID.
 */
export async function GET(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ collectionId: string; designItemId: string }> },
) {
  const { designItemId } = await params;

  const item = await designItemRepo.findById(designItemId);
  if (!item) {
    return NextResponse.json(
      { error: `DesignItem not found: "${designItemId}"` },
      { status: 404 },
    );
  }

  return NextResponse.json(item);
}
