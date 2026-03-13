/**
 * Canonical list of job type identifiers used across queues and workers.
 */
export const jobTypes = [
  "stage-execution",
  "image-generation",
  "asset-processing",
] as const;

export type JobType = (typeof jobTypes)[number];
