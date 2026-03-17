import { GeneratedImage } from "./GeneratedImage";

export interface GeneratedImageRepository {
  save(image: GeneratedImage): Promise<void>;
  findById(id: string): Promise<GeneratedImage | null>;
  findByDesignItemId(designItemId: string): Promise<GeneratedImage[]>;
  findByExecutionId(executionId: string): Promise<GeneratedImage[]>;
}
