import { Queue, Worker, type Job } from "bullmq";
import { jobTypes, type JobType } from "./jobTypes";

export const QUEUE_NAMES = {
  STAGE_EXECUTION: "stage-execution",
  IMAGE_GENERATION: "image-generation",
  ASSET_PROCESSING: "asset-processing",
} as const satisfies Record<string, JobType>;

function redisConnectionFromUrl(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
  };
}

/**
 * Creates a BullMQ Queue for every registered job type.
 */
export function createQueues(
  redisUrl: string
): Record<JobType, Queue> {
  const connection = redisConnectionFromUrl(redisUrl);

  return Object.fromEntries(
    jobTypes.map((type) => [type, new Queue(type, { connection })])
  ) as Record<JobType, Queue>;
}

/**
 * Creates a BullMQ Worker for every job type that has a handler provided.
 */
export function createWorkers(
  redisUrl: string,
  handlers: Partial<Record<JobType, (job: Job) => Promise<void>>>
): Worker[] {
  const connection = redisConnectionFromUrl(redisUrl);

  return Object.entries(handlers).map(([type, handler]) => {
    return new Worker(type, handler as (job: Job) => Promise<void>, {
      connection,
    });
  });
}
