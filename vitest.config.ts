import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["tests/e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary", "lcov"],
      include: [
        "src/domain/**",
        "src/application/**",
        "src/infrastructure/**",
        "src/server/**",
      ],
      exclude: [
        // Implementações que requerem serviços externos (cobertas via e2e/integration)
        "src/infrastructure/db/client.ts",
        "src/infrastructure/db/repositories/Pg*.ts",
        "src/infrastructure/db/migrate.ts",
        "src/infrastructure/providers/Gemini*.ts",
        "src/infrastructure/providers/Pollinations*.ts",
        "src/server/jobs/index.ts",
        "src/server/jobs/queues.ts",
        "src/server/jobs/worker.ts",
        "src/server/jobs/handlers/**",
        "node_modules/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 65,
        statements: 80,
      },
    },
  },
});
