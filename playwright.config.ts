import { defineConfig } from "@playwright/test";

const isCI = process.env.CI === "true";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: isCI ? 1 : 0,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  webServer: {
    command: isCI ? "npm run build && npm start" : "npm run dev",
    port: 3000,
    reuseExistingServer: !isCI,
    timeout: isCI ? 120_000 : 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
