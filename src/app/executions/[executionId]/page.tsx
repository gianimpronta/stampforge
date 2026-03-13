import { notFound } from "next/navigation";
import {
  ExecutionDetail,
} from "@/components/stampforge/ExecutionDetail";
import { BackButton } from "@/components/stampforge/BackButton";
import { stageExecutionRepo } from "@/lib/server/dependencies";

interface ExecutionDetailPageProps {
  params: Promise<{ executionId: string }>;
}

export default async function ExecutionDetailPage({
  params,
}: ExecutionDetailPageProps) {
  const { executionId } = await params;
  const execution = await stageExecutionRepo.findById(executionId);

  if (!execution) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <BackButton />
        <h1 className="text-2xl font-bold">Detalhes da Execução</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          {execution.id}
        </p>
      </div>

      <ExecutionDetail execution={execution} />
    </main>
  );
}
