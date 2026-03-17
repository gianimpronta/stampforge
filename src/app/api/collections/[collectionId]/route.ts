import { NextRequest, NextResponse } from "next/server";
import { collectionRepo } from "../../../../lib/server/dependencies";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> },
) {
  const { collectionId } = await params;
  const collection = await collectionRepo.findById(collectionId);

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  return NextResponse.json(collection);
}
