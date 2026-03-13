import { NextRequest, NextResponse } from "next/server";
import { generatedImageRepo } from "../../../lib/server/dependencies";

/**
 * GET /api/images
 * Lista todas as imagens geradas. Aceita filtro opcional ?designItemId=...
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const designItemId = searchParams.get("designItemId");

  if (designItemId) {
    const images = await generatedImageRepo.findByDesignItemId(designItemId);
    return NextResponse.json(images);
  }

  // Sem filtro: retorna lista vazia (repositório não expõe findAll ainda)
  return NextResponse.json([]);
}
