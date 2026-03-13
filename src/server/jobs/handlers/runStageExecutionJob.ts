import type { Job } from "bullmq";
import { runStageExecution } from "../../../application/runStageExecution";
import {
  stageExecutionRepo,
  collectionRepo,
  designItemRepo,
} from "../../../lib/server/dependencies";
import { createGeminiTextProvider } from "../../../infrastructure/providers/GeminiTextProvider";
import type { LLMProvider } from "../../../domain/providers/LLMProvider";

/**
 * Payload esperado pelo job de execução de estágio.
 */
export interface RunStageExecutionJobData {
  stageKey: string;
  targetId: string;
}

function getLLMProvider(): LLMProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash";

  if (apiKey && apiKey !== "your-api-key-here") {
    return createGeminiTextProvider({ apiKey, model });
  }

  return {
    async generateText(request) {
      return {
        content: `[stub] Resposta simulada para o prompt: ${request.prompt.slice(0, 100)}...`,
        provider: "stub",
        model: "stub",
      };
    },
  };
}

/**
 * Handler BullMQ para o job de execução de estágio do pipeline.
 *
 * Consome a fila "stage-execution", extrai stageKey e targetId do payload,
 * configura as dependências e delega ao caso de uso runStageExecution.
 *
 * NOTE: Em produção, as instâncias de repositório devem ser singletons injetados
 * no worker, e não criados a cada job. Esta implementação de MVP usa instâncias
 * in-memory que serão substituídas por implementações Postgres.
 */
export async function runStageExecutionJob(job: Job): Promise<void> {
  const data = job.data as RunStageExecutionJobData;

  if (!data.stageKey || !data.targetId) {
    throw new Error(
      `Job inválido: stageKey e targetId são obrigatórios. Recebido: ${JSON.stringify(data)}`,
    );
  }

  const { stageKey, targetId } = data;

  console.log(`[Worker] Iniciando execução do estágio "${stageKey}" para targetId="${targetId}"`);

  const execution = await runStageExecution({
    stageKey,
    targetId,
    deps: {
      executionRepo: stageExecutionRepo,
      collectionRepo,
      designItemRepo,
      llm: getLLMProvider(),
    },
  });

  console.log(
    `[Worker] Estágio "${stageKey}" finalizado com status="${execution.status}" (id=${execution.id})`,
  );
}
