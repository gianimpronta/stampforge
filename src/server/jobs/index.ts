/**
 * Job system barrel export.
 *
 * Job handlers will be registered here as the pipeline stages are implemented.
 */

export type JobHandler = (payload: unknown) => Promise<void>;

export interface JobDefinition {
  name: string;
  handler: JobHandler;
}

const registry = new Map<string, JobHandler>();

export function registerJob(name: string, handler: JobHandler): void {
  registry.set(name, handler);
}

export function getJobHandler(name: string): JobHandler | undefined {
  return registry.get(name);
}

export function getRegisteredJobs(): string[] {
  return Array.from(registry.keys());
}
