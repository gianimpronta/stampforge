import { Pool } from "pg";
import { GeneratedImage, GeneratedImageStatus } from "../../../domain/generation/GeneratedImage";
import { GeneratedImageRepository } from "../../../domain/generation/GeneratedImageRepository";

export class PgGeneratedImageRepository implements GeneratedImageRepository {
  constructor(private readonly pool: Pool) {}

  async save(image: GeneratedImage): Promise<void> {
    await this.pool.query(
      `INSERT INTO generated_images (
         id, design_item_id, source_execution_id, file_path,
         prompt_used, provider, model, metadata, status, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE
         SET file_path = EXCLUDED.file_path,
             prompt_used = EXCLUDED.prompt_used,
             provider = EXCLUDED.provider,
             model = EXCLUDED.model,
             metadata = EXCLUDED.metadata,
             status = EXCLUDED.status`,
      [
        image.id,
        image.designItemId,
        image.sourceExecutionId,
        image.filePath,
        image.promptUsed,
        image.provider,
        image.model,
        JSON.stringify(image.metadata),
        image.status,
        image.createdAt,
      ],
    );
  }

  async findById(id: string): Promise<GeneratedImage | null> {
    const result = await this.pool.query(
      "SELECT * FROM generated_images WHERE id = $1",
      [id],
    );

    if (result.rows.length === 0) return null;

    return this.rowToGeneratedImage(result.rows[0]);
  }

  async findByDesignItemId(designItemId: string): Promise<GeneratedImage[]> {
    const result = await this.pool.query(
      "SELECT * FROM generated_images WHERE design_item_id = $1 ORDER BY created_at ASC",
      [designItemId],
    );

    return result.rows.map((row) => this.rowToGeneratedImage(row));
  }

  async findByExecutionId(executionId: string): Promise<GeneratedImage[]> {
    const result = await this.pool.query(
      "SELECT * FROM generated_images WHERE source_execution_id = $1 ORDER BY created_at ASC",
      [executionId],
    );

    return result.rows.map((row) => this.rowToGeneratedImage(row));
  }

  private rowToGeneratedImage(row: Record<string, unknown>): GeneratedImage {
    return GeneratedImage.reconstruct({
      id: row.id as string,
      designItemId: row.design_item_id as string,
      sourceExecutionId: row.source_execution_id as string,
      filePath: row.file_path as string,
      promptUsed: row.prompt_used as string,
      provider: row.provider as string,
      model: row.model as string,
      metadata: row.metadata as Record<string, unknown>,
      status: row.status as GeneratedImageStatus,
      createdAt: row.created_at as Date,
    });
  }
}
