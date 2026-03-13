import { NextRequest, NextResponse } from "next/server";
import { createCollection } from "../../../application/createCollection";
import { collectionRepo } from "../../../lib/server/dependencies";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, briefing } = body;

  if (!name || !briefing) {
    return NextResponse.json(
      { error: "name and briefing are required" },
      { status: 400 },
    );
  }

  const collection = await createCollection({ name, briefing }, { collectionRepo });

  return NextResponse.json(collection, { status: 201 });
}

export async function GET() {
  const collections = await collectionRepo.findAll();
  return NextResponse.json(collections);
}
