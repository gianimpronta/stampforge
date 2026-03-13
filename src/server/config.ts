export interface RuntimeConfig {
  databaseUrl: string;
  redisUrl: string;
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv): RuntimeConfig {
  if (!env.DATABASE_URL || !env.REDIS_URL) {
    throw new Error("Missing runtime configuration");
  }

  return {
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
  };
}
