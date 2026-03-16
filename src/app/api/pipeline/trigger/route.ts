import { NextRequest, NextResponse } from "next/server";
import { runStageExecution } from "../../../../application/runStageExecution";
import {
  stageExecutionRepo,
  collectionRepo,
  designItemRepo,
  generatedImageRepo,
} from "../../../../lib/server/dependencies";
import { createGeminiTextProvider } from "../../../../infrastructure/providers/GeminiTextProvider";
import { createPollinationsImageProvider } from "../../../../infrastructure/providers/PollinationsImageProvider";
import { LocalAssetStorage } from "../../../../infrastructure/storage/LocalAssetStorage";
import type { LLMProvider } from "../../../../domain/providers/LLMProvider";

function getLLMProvider(): LLMProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash";

  if (apiKey && apiKey !== "your-api-key-here") {
    return createGeminiTextProvider({ apiKey, model });
  }

  // Fallback stub quando não há chave configurada
  return {
    generateText: async (input) => ({
      content: `[stub] Resposta simulada para o prompt: ${input.prompt.slice(0, 100)}...`,
      provider: "stub",
      model: "stub",
    }),
  };
}

/**
 * POST /api/pipeline/trigger
 * Body: { stageKey: string, targetId: string }
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { stageKey, targetId } = body as Record<string, unknown>;

  if (!stageKey || typeof stageKey !== "string") {
    return NextResponse.json({ error: "stageKey is required" }, { status: 400 });
  }
  if (!targetId || typeof targetId !== "string") {
    return NextResponse.json({ error: "targetId is required" }, { status: 400 });
  }

  try {
    const imageProvider = createPollinationsImageProvider({
      model: process.env.IMAGE_GENERATION_MODEL ?? "flux",
    });

    const storage = new LocalAssetStorage(
      process.env.ASSET_STORAGE_PATH ?? "./storage/assets",
    );

    const execution = await runStageExecution({
      stageKey,
      targetId,
      deps: {
        executionRepo: stageExecutionRepo,
        collectionRepo,
        designItemRepo,
        llm: getLLMProvider(),
        imageProvider,
        storage,
        generatedImageRepo,
      },
    });

    return NextResponse.json(execution, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
