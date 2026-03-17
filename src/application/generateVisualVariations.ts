import { randomUUID } from "node:crypto";
import { GeneratedImage } from "../domain/generation/GeneratedImage";
import type { GeneratedImageRepository } from "../domain/generation/GeneratedImageRepository";
import type { ImageGenerationProvider } from "../domain/providers/ImageGenerationProvider";
import type { AssetStorage } from "../domain/providers/AssetStorage";

export interface GenerateVisualVariationsInput {
  designItemId: string;
  executionId: string;
  prompt: string;
  count?: number;
}

export interface GenerateVisualVariationsDeps {
  generatedImageRepo: GeneratedImageRepository;
  imageProvider: ImageGenerationProvider;
  storage: AssetStorage;
}

/**
 * generateVisualVariations gera variações visuais para um design item.
 *
 * Cada imagem gerada é salva com rastreabilidade completa:
 * - sourceExecutionId: referência exata ao StageExecution que a produziu
 * - provider e model: identificadores do provedor utilizado
 * - promptUsed: prompt exato enviado ao provedor
 */
export async function generateVisualVariations(
  input: GenerateVisualVariationsInput,
  deps: GenerateVisualVariationsDeps,
): Promise<GeneratedImage[]> {
  const { designItemId, executionId, prompt, count = 1 } = input;
  const { generatedImageRepo, imageProvider, storage } = deps;

  const response = await imageProvider.generateImages({ prompt, count });

  const savedImages: GeneratedImage[] = [];

  for (let i = 0; i < response.images.length; i++) {
    const { data, mimeType } = response.images[i];
    const imageId = randomUUID();
    const ext = mimeType.split("/")[1] ?? "png";
    const filePath = `items/${designItemId}/variations/${imageId}.${ext}`;

    await storage.save(filePath, data, mimeType);

    const image = GeneratedImage.create({
      id: imageId,
      designItemId,
      sourceExecutionId: executionId,
      filePath,
      promptUsed: prompt,
      provider: response.provider,
      model: response.model,
      metadata: { index: i, mimeType },
      status: "ready",
    });

    await generatedImageRepo.save(image);
    savedImages.push(image);
  }

  return savedImages;
}
