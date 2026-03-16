import { defineConfig } from "@playwright/test";

const isCI = process.env.CI === "true";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: isCI ? 1 : 0,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
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
