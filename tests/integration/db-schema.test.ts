import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("database schema", () => {
  it("defines the core pipeline tables", () => {
    const sql = readFileSync("src/infrastructure/db/migrations/0001_initial.sql", "utf8");

    expect(sql).toContain("collections");
    expect(sql).toContain("design_items");
    expect(sql).toContain("pipeline_stages");
    expect(sql).toContain("stage_executions");
    expect(sql).toContain("generated_images");
  });
});
