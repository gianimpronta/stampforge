import type { GeneratedImage } from "../domain/generation/GeneratedImage";
import type { GeneratedImageRepository } from "../domain/generation/GeneratedImageRepository";

export interface ListGeneratedImagesInput {
  designItemId: string;
}

export interface ListGeneratedImagesDeps {
  generatedImageRepo: GeneratedImageRepository;
}

/**
 * listGeneratedImages retorna todas as imagens geradas para um design item.
 */
export async function listGeneratedImages(
  input: ListGeneratedImagesInput,
  deps: ListGeneratedImagesDeps,
): Promise<GeneratedImage[]> {
  const { designItemId } = input;
  const { generatedImageRepo } = deps;

  return generatedImageRepo.findByDesignItemId(designItemId);
}
