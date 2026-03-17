import { notFound } from "next/navigation";
import {
  ExecutionDetail,
  type ExecutionDetailData,
} from "@/components/stampforge/ExecutionDetail";
import { BackButton } from "@/components/stampforge/BackButton";
import { stageExecutionRepo } from "@/lib/server/dependencies";

interface ExecutionDetailPageProps {
  readonly params: Promise<{ readonly executionId: string }>;
}

export default async function ExecutionDetailPage({
  params,
}: ExecutionDetailPageProps) {
  const { executionId } = await params;
  const execution = await stageExecutionRepo.findById(executionId);

  if (!execution) {
    notFound();
  }

  const data: ExecutionDetailData = {
    id: execution.id,
    stageKey: execution.stageKey,
    targetId: execution.targetId,
    targetType: execution.targetType,
    status: execution.status,
    inputSnapshot: execution.inputSnapshot,
    outputSnapshot: execution.outputSnapshot,
    startedAt: execution.startedAt.toISOString(),
    completedAt: execution.completedAt?.toISOString() ?? null,
    approvedBy: execution.approvedBy,
    approvedAt: execution.approvedAt?.toISOString() ?? null,
    rejectedBy: execution.rejectedBy,
    rejectedAt: execution.rejectedAt?.toISOString() ?? null,
    rejectionReason: execution.rejectionReason,
    failureReason: execution.failureReason,
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <BackButton />
        <h1 className="text-2xl font-bold">Detalhes da Execução</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          {execution.id}
        </p>
      </div>

      <ExecutionDetail execution={data} />
    </main>
  );
}
