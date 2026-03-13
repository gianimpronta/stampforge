import { notFound } from "next/navigation";
import {
  ExecutionDetail,
  type ExecutionDetailData,
} from "@/components/stampforge/ExecutionDetail";
import { BackButton } from "@/components/stampforge/BackButton";

interface ExecutionDetailPageProps {
  params: Promise<{ executionId: string }>;
}

async function fetchExecution(
  executionId: string,
): Promise<ExecutionDetailData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(
      `${baseUrl}/api/pipeline/executions/${executionId}`,
      { cache: "no-store" },
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Erro ao carregar execução");
    return res.json();
  } catch {
    return null;
  }
}

export default async function ExecutionDetailPage({
  params,
}: ExecutionDetailPageProps) {
  const { executionId } = await params;
  const execution = await fetchExecution(executionId);

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
