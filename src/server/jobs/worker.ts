import { loadRuntimeConfig } from "../config";

try {
  const config = loadRuntimeConfig(process.env);

  console.log(`Worker starting with database: ${config.databaseUrl}`);
  console.log("Worker ready. Waiting for jobs...");
} catch (error) {
  console.error("Failed to load runtime config:", error);
  process.exit(1);
}
