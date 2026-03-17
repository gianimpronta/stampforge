import { Pool } from "pg";
import { Collection } from "../../../domain/collections/Collection";
import { CollectionRepository } from "../../../domain/collections/CollectionRepository";

export class PgCollectionRepository implements CollectionRepository {
  constructor(private readonly pool: Pool) {}

  async save(collection: Collection): Promise<void> {
    await this.pool.query(
      `INSERT INTO collections (id, name, briefing, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             briefing = EXCLUDED.briefing,
             updated_at = EXCLUDED.updated_at`,
      [
        collection.id,
        collection.name,
        collection.briefing,
        collection.createdAt,
        collection.updatedAt,
      ],
    );
  }

  async findById(id: string): Promise<Collection | null> {
    const result = await this.pool.query(
      "SELECT * FROM collections WHERE id = $1",
      [id],
    );

    if (result.rows.length === 0) return null;

    return this.rowToCollection(result.rows[0]);
  }

  async findAll(): Promise<Collection[]> {
    const result = await this.pool.query(
      "SELECT * FROM collections ORDER BY created_at ASC",
    );

    return result.rows.map((row) => this.rowToCollection(row));
  }

  private rowToCollection(row: Record<string, unknown>): Collection {
    return Collection.reconstruct({
      id: row.id as string,
      name: row.name as string,
      briefing: row.briefing as string,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    });
  }
}
