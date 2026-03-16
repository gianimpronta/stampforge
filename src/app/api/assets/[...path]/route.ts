import { NextRequest, NextResponse } from "next/server";
import { LocalAssetStorage } from "../../../../infrastructure/storage/LocalAssetStorage";

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

/**
 * GET /api/assets/[...path]
 * Serve arquivos estáticos do storage local de assets.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const filePath = path.join("/");

  // Previne path traversal
  if (filePath.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const storage = new LocalAssetStorage(
    process.env.ASSET_STORAGE_PATH ?? "./storage/assets",
  );

  const exists = await storage.exists(filePath);
  if (!exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = await storage.read(filePath);
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

  return new NextResponse(data, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
