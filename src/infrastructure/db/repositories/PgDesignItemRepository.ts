import { Pool } from "pg";
import { DesignItem } from "../../../domain/design-items/DesignItem";
import { DesignItemRepository } from "../../../domain/design-items/DesignItemRepository";

export class PgDesignItemRepository implements DesignItemRepository {
  constructor(private readonly pool: Pool) {}

  async save(item: DesignItem): Promise<void> {
    await this.pool.query(
      `INSERT INTO design_items (id, collection_id, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             updated_at = EXCLUDED.updated_at`,
      [item.id, item.collectionId, item.name, item.createdAt, item.updatedAt],
    );
  }

  async findById(id: string): Promise<DesignItem | null> {
    const result = await this.pool.query(
      "SELECT * FROM design_items WHERE id = $1",
      [id],
    );

    if (result.rows.length === 0) return null;

    return this.rowToDesignItem(result.rows[0]);
  }

  async findByCollectionId(collectionId: string): Promise<DesignItem[]> {
    const result = await this.pool.query(
      "SELECT * FROM design_items WHERE collection_id = $1 ORDER BY created_at ASC",
      [collectionId],
    );

    return result.rows.map((row) => this.rowToDesignItem(row));
  }

  private rowToDesignItem(row: Record<string, unknown>): DesignItem {
    return DesignItem.reconstruct({
      id: row.id as string,
      collectionId: row.collection_id as string,
      name: row.name as string,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    });
  }
}
