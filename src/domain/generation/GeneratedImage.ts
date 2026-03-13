export type GeneratedImageStatus = "pending" | "ready" | "failed";

export interface GeneratedImageProps {
  id: string;
  designItemId: string;
  sourceExecutionId: string;
  filePath: string;
  promptUsed: string;
  provider: string;
  model: string;
  metadata: Record<string, unknown>;
  status: GeneratedImageStatus;
  createdAt: Date;
}

export interface CreateGeneratedImageInput {
  id: string;
  designItemId: string;
  sourceExecutionId: string;
  filePath: string;
  promptUsed: string;
  provider: string;
  model: string;
  metadata: Record<string, unknown>;
  status: GeneratedImageStatus;
}

/**
 * GeneratedImage is an image asset produced by a stage execution.
 * Every image must trace back to the exact StageExecution that produced it,
 * ensuring full traceability of generated outputs.
 */
export class GeneratedImage {
  readonly id: string;
  readonly designItemId: string;
  readonly sourceExecutionId: string;
  readonly filePath: string;
  readonly promptUsed: string;
  readonly provider: string;
  readonly model: string;
  readonly metadata: Record<string, unknown>;
  readonly status: GeneratedImageStatus;
  readonly createdAt: Date;

  private constructor(props: GeneratedImageProps) {
    this.id = props.id;
    this.designItemId = props.designItemId;
    this.sourceExecutionId = props.sourceExecutionId;
    this.filePath = props.filePath;
    this.promptUsed = props.promptUsed;
    this.provider = props.provider;
    this.model = props.model;
    this.metadata = props.metadata;
    this.status = props.status;
    this.createdAt = props.createdAt;
  }

  /**
   * Reconstitutes a GeneratedImage from a persistence snapshot.
   * Bypasses validation — only use when loading from a trusted data store.
   */
  static reconstruct(props: GeneratedImageProps): GeneratedImage {
    return new GeneratedImage(props);
  }

  static create(input: CreateGeneratedImageInput): GeneratedImage {
    if (!input.id || input.id.trim() === "") {
      throw new Error("GeneratedImage id is required");
    }
    if (!input.designItemId || input.designItemId.trim() === "") {
      throw new Error("GeneratedImage designItemId is required");
    }
    if (!input.sourceExecutionId || input.sourceExecutionId.trim() === "") {
      throw new Error("GeneratedImage sourceExecutionId is required");
    }
    if (!input.filePath || input.filePath.trim() === "") {
      throw new Error("GeneratedImage filePath is required");
    }
    if (!input.promptUsed || input.promptUsed.trim() === "") {
      throw new Error("GeneratedImage promptUsed is required");
    }
    if (!input.provider || input.provider.trim() === "") {
      throw new Error("GeneratedImage provider is required");
    }
    if (!input.model || input.model.trim() === "") {
      throw new Error("GeneratedImage model is required");
    }

    return new GeneratedImage({
      ...input,
      createdAt: new Date(),
    });
  }
}
