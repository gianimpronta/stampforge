import { NextRequest, NextResponse } from "next/server";
import { generatedImageRepo } from "../../../../lib/server/dependencies";

/**
 * GET /api/images/[imageId]
 * Retorna uma imagem com todos os metadados de rastreabilidade.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const { imageId } = await params;

  const image = await generatedImageRepo.findById(imageId);
  if (!image) {
    return NextResponse.json(
      { error: `GeneratedImage not found: "${imageId}"` },
      { status: 404 },
    );
  }

  return NextResponse.json(image);
}
