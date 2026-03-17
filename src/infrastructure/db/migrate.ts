import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createDbClient } from "./client";
import { loadRuntimeConfig } from "../../server/config";

async function main() {
  const config = loadRuntimeConfig(process.env);
  const pool = createDbClient(config.databaseUrl);

  const migrationPath = join(
    process.cwd(),
    "src/infrastructure/db/migrations/0001_initial.sql"
  );

  const sql = readFileSync(migrationPath, "utf-8");

  console.log("Executando migração 0001_initial...");

  try {
    await pool.query(sql);
    console.log("Migração concluída com sucesso.");
  } catch (error) {
    console.error("Erro durante a migração:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
