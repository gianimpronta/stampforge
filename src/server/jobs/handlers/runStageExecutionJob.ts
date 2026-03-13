import type { Job } from "bullmq";
import { runStageExecution } from "../../../application/runStageExecution";
import { InMemoryStageExecutionRepository } from "../../../infrastructure/db/repositories/InMemoryStageExecutionRepository";
import { InMemoryCollectionRepository } from "../../../infrastructure/db/repositories/InMemoryCollectionRepository";
import { InMemoryDesignItemRepository } from "../../../infrastructure/db/repositories/InMemoryDesignItemRepository";
import type { LLMProvider } from "../../../domain/providers/LLMProvider";

/**
 * Payload esperado pelo job de execução de estágio.
 */
export interface RunStageExecutionJobData {
  stageKey: string;
  targetId: string;
}

/**
 * Stub de LLM provider para uso no MVP.
 * Será substituído por um provider real (OpenAI, Anthropic, etc.) no futuro.
 */
function createStubLLMProvider(): LLMProvider {
  return {
    async generateText(request) {
      console.log(`[LLM Stub] Prompt recebido para processamento:\n${request.prompt}\n`);
      return {
        content: `[Stub] Resultado gerado para o estágio. Prompt: ${request.prompt.slice(0, 100)}...`,
        provider: "stub",
        model: "stub-v1",
        usage: { inputTokens: 0, outputTokens: 0 },
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

  // TODO: substituir por repositórios Postgres quando a infra estiver disponível
  const executionRepo = new InMemoryStageExecutionRepository();
  const collectionRepo = new InMemoryCollectionRepository();
  const designItemRepo = new InMemoryDesignItemRepository();
  const llm = createStubLLMProvider();

  const execution = await runStageExecution({
    stageKey,
    targetId,
    deps: {
      executionRepo,
      collectionRepo,
      designItemRepo,
      llm,
    },
  });

  console.log(
    `[Worker] Estágio "${stageKey}" finalizado com status="${execution.status}" (id=${execution.id})`,
  );
}
