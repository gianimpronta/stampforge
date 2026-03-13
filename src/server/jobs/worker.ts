import { loadRuntimeConfig } from "../config";
import { createWorkers } from "./queues";
import { runStageExecutionJob } from "./handlers/runStageExecutionJob";

let config;
try {
  config = loadRuntimeConfig(process.env);
} catch (error) {
  console.error("Failed to load runtime config:", error);
  process.exit(1);
}

const workers = createWorkers(config.redisUrl, {
  "stage-execution": runStageExecutionJob,
});

for (const worker of workers) {
  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} (${job.name}) concluído`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} (${job?.name}) falhou:`, err.message);
  });
}

console.log(`Worker pronto. Ouvindo ${workers.length} fila(s)...`);
