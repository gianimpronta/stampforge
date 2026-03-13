import { describe, expect, it } from "vitest";
import { loadRuntimeConfig } from "../../src/server/config";

describe("runtime config", () => {
  it("requires database and redis configuration", () => {
    expect(() => loadRuntimeConfig({} as NodeJS.ProcessEnv)).toThrow();
  });

  it("returns config when all required variables are present", () => {
    const config = loadRuntimeConfig({
      DATABASE_URL: "postgresql://localhost:5432/stampforge",
      REDIS_URL: "redis://localhost:6379",
    } as unknown as NodeJS.ProcessEnv);

    expect(config.databaseUrl).toBe("postgresql://localhost:5432/stampforge");
    expect(config.redisUrl).toBe("redis://localhost:6379");
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() =>
      loadRuntimeConfig({
        REDIS_URL: "redis://localhost:6379",
      } as unknown as NodeJS.ProcessEnv)
    ).toThrow("Missing runtime configuration");
  });

  it("throws when REDIS_URL is missing", () => {
    expect(() =>
      loadRuntimeConfig({
        DATABASE_URL: "postgresql://localhost:5432/stampforge",
      } as unknown as NodeJS.ProcessEnv)
    ).toThrow("Missing runtime configuration");
  });
});
