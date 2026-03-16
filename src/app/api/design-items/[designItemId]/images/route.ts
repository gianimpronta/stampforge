import { NextRequest, NextResponse } from "next/server";
import { listGeneratedImages } from "../../../../../application/listGeneratedImages";
import { generateVisualVariations } from "../../../../../application/generateVisualVariations";
import { generatedImageRepo } from "../../../../../lib/server/dependencies";
import { createGeminiImageProvider } from "../../../../../infrastructure/providers/GeminiImageProvider";
import { LocalAssetStorage } from "../../../../../infrastructure/storage/LocalAssetStorage";

/**
 * GET /api/design-items/[designItemId]/images
 * Lista todas as imagens geradas para um design item.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ designItemId: string }> },
) {
  const { designItemId } = await params;

  const images = await listGeneratedImages(
    { designItemId },
    { generatedImageRepo },
  );

  return NextResponse.json(images);
}

/**
 * POST /api/design-items/[designItemId]/images/generate
 * Dispara a geração de variações visuais para um design item.
 *
 * Body esperado:
 * {
 *   executionId: string,
 *   prompt: string,
 *   count?: number
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ designItemId: string }> },
) {
  const { designItemId } = await params;
  const body = await request.json();
  const { executionId, prompt, count } = body;

  if (!executionId || !prompt) {
    return NextResponse.json(
      { error: "executionId and prompt are required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const imageProvider = createGeminiImageProvider({
    apiKey,
    model: process.env.GEMINI_IMAGE_MODEL ?? "imagen-4.0-generate-001",
  });

  const storage = new LocalAssetStorage(
    process.env.ASSET_STORAGE_PATH ?? "./storage/assets",
  );

  const images = await generateVisualVariations(
    { designItemId, executionId, prompt, count },
    { generatedImageRepo, imageProvider, storage },
  );

  return NextResponse.json(images, { status: 201 });
}
