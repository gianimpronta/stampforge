import { NextRequest, NextResponse } from "next/server";
import type { CollectionContext } from "../../../../../../../domain/design-items/DesignItem";
import {
  designItemRepo,
  stageExecutionRepo,
} from "../../../../../../../lib/server/dependencies";

type Params = { collectionId: string; designItemId: string };

/**
 * GET /api/collections/[collectionId]/design-items/[designItemId]/collection-context
 * Returns the current collectionContext for a design item.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { designItemId } = await params;
  const item = await designItemRepo.findById(designItemId);
  if (!item) {
    return NextResponse.json(
      { error: `DesignItem not found: "${designItemId}"` },
      { status: 404 },
    );
  }
  return NextResponse.json(item.collectionContext);
}

/**
 * PUT /api/collections/[collectionId]/design-items/[designItemId]/collection-context
 * Body: CollectionContext — replaces the entire collectionContext.
 *
 * After updating, marks any previously approved design_item executions that
 * depended on changed context entries as stale.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { designItemId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Body must be a CollectionContext object" },
      { status: 400 },
    );
  }

  const item = await designItemRepo.findById(designItemId);
  if (!item) {
    return NextResponse.json(
      { error: `DesignItem not found: "${designItemId}"` },
      { status: 404 },
    );
  }

  const newContext = body as CollectionContext;
  const oldContext = item.collectionContext;

  // Determine which collection stage keys changed
  const changedKeys = new Set<string>();
  const allKeys = new Set([
    ...Object.keys(oldContext),
    ...Object.keys(newContext),
  ]);
  for (const key of allKeys) {
    const oldEntry = oldContext[key];
    const newEntry = newContext[key];
    if (
      oldEntry?.executionId !== newEntry?.executionId ||
      oldEntry?.styleIndex !== newEntry?.styleIndex
    ) {
      changedKeys.add(key);
    }
  }

  // Save updated design item
  const updated = item.setCollectionContext(newContext);
  await designItemRepo.save(updated);

  // Mark stale: approved executions for this design item that depended on changed keys
  if (changedKeys.size > 0) {
    const executions = await stageExecutionRepo.findByTargetId(designItemId);
    for (const exec of executions) {
      if (exec.status !== "approved") continue;
      // Check if this execution's input snapshot referenced any changed collection context key
      const snapshotCtxOutputs = exec.inputSnapshot.collectionContextOutputs as
        | Record<string, unknown>
        | undefined;
      if (!snapshotCtxOutputs) continue;
      const usedChangedKey = Object.keys(snapshotCtxOutputs).some((k) =>
        changedKeys.has(k),
      );
      if (usedChangedKey) {
        const stale = exec.markStale();
        await stageExecutionRepo.save(stale);
      }
    }
  }

  return NextResponse.json(updated.collectionContext);
}
