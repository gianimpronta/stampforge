import { NextRequest, NextResponse } from "next/server";
import { createDesignItem } from "../../../../../application/createDesignItem";
import { designItemRepo } from "../../../../../lib/server/dependencies";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> },
) {
  const { collectionId } = await params;
  const body = await request.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const item = await createDesignItem({ collectionId, name }, { designItemRepo });

  return NextResponse.json(item, { status: 201 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> },
) {
  const { collectionId } = await params;
  const items = await designItemRepo.findByCollectionId(collectionId);
  return NextResponse.json(items);
}
