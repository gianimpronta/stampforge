import { GeneratedImage } from "../../../domain/generation/GeneratedImage";
import { GeneratedImageRepository } from "../../../domain/generation/GeneratedImageRepository";

export class InMemoryGeneratedImageRepository implements GeneratedImageRepository {
  private store = new Map<string, GeneratedImage>();

  async save(image: GeneratedImage): Promise<void> {
    this.store.set(image.id, image);
  }

  async findById(id: string): Promise<GeneratedImage | null> {
    return this.store.get(id) ?? null;
  }

  async findByDesignItemId(designItemId: string): Promise<GeneratedImage[]> {
    return Array.from(this.store.values()).filter(
      (image) => image.designItemId === designItemId,
    );
  }

  async findByExecutionId(executionId: string): Promise<GeneratedImage[]> {
    return Array.from(this.store.values()).filter(
      (image) => image.sourceExecutionId === executionId,
    );
  }
}
