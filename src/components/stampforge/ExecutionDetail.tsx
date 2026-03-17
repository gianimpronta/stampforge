"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  type StageExecutionStatus,
  STATUS_LABELS,
  STATUS_VARIANTS,
  ApproveRejectActions,
} from "./StageExecutionPanel";

export interface ExecutionDetailData {
  id: string;
  stageKey: string;
  targetId: string;
  targetType: string;
  status: StageExecutionStatus;
  inputSnapshot: Record<string, unknown>;
  outputSnapshot: Record<string, unknown> | null;
  startedAt: string;
  completedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  failureReason: string | null;
}

interface ExecutionDetailProps {
  readonly execution: ExecutionDetailData;
}

export function ExecutionDetail({ execution: initialExecution }: ExecutionDetailProps) {
  const [execution, setExecution] = useState<ExecutionDetailData>(initialExecution);

  const promptUsed =
    execution.outputSnapshot?.prompt ??
    execution.outputSnapshot?.promptUsed ??
    execution.inputSnapshot?.prompt ??
    null;

  return (
    <div className="space-y-6 text-sm">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground font-medium">Estágio</p>
          <p className="font-mono">{execution.stageKey}</p>
        </div>
        <div>
          <p className="text-muted-foreground font-medium">Status</p>
          <Badge variant={STATUS_VARIANTS[execution.status]} className="mt-1">
            {STATUS_LABELS[execution.status]}
          </Badge>
        </div>
        <div>
          <p className="text-muted-foreground font-medium">Tipo do alvo</p>
          <p>{execution.targetType}</p>
        </div>
        <div>
          <p className="text-muted-foreground font-medium">ID do alvo</p>
          <p className="truncate font-mono text-xs">{execution.targetId}</p>
        </div>
        <div>
          <p className="text-muted-foreground font-medium">Iniciado em</p>
          <p>{new Date(execution.startedAt).toLocaleString("pt-BR")}</p>
        </div>
        {execution.completedAt && (
          <div>
            <p className="text-muted-foreground font-medium">Concluído em</p>
            <p>{new Date(execution.completedAt).toLocaleString("pt-BR")}</p>
          </div>
        )}
        {execution.approvedAt && (
          <div>
            <p className="text-muted-foreground font-medium">Aprovado em</p>
            <p>{new Date(execution.approvedAt).toLocaleString("pt-BR")}</p>
          </div>
        )}
        {execution.approvedBy && (
          <div>
            <p className="text-muted-foreground font-medium">Aprovado por</p>
            <p>{execution.approvedBy}</p>
          </div>
        )}
        {execution.rejectedAt && (
          <div>
            <p className="text-muted-foreground font-medium">Reprovado em</p>
            <p>{new Date(execution.rejectedAt).toLocaleString("pt-BR")}</p>
          </div>
        )}
        {execution.rejectedBy && (
          <div>
            <p className="text-muted-foreground font-medium">Reprovado por</p>
            <p>{execution.rejectedBy}</p>
          </div>
        )}
      </div>

      {execution.rejectionReason && (
        <div>
          <p className="text-muted-foreground font-medium">Motivo da reprovação</p>
          <p className="text-destructive mt-1">{execution.rejectionReason}</p>
        </div>
      )}

      {execution.failureReason && (
        <div>
          <p className="text-muted-foreground font-medium">Erro técnico</p>
          <p className="text-destructive mt-1">{execution.failureReason}</p>
        </div>
      )}

      {promptUsed && (
        <div>
          <p className="text-muted-foreground mb-1 font-medium">Prompt usado</p>
          <div className="bg-muted rounded-md p-3 text-xs whitespace-pre-wrap">
            {typeof promptUsed === "string" ? promptUsed : JSON.stringify(promptUsed)}
          </div>
        </div>
      )}

      <div>
        <p className="text-muted-foreground mb-1 font-medium">Snapshot de entrada</p>
        <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
          {JSON.stringify(execution.inputSnapshot, null, 2)}
        </pre>
      </div>

      {execution.outputSnapshot !== null && (
        <div>
          <p className="text-muted-foreground mb-1 font-medium">Snapshot de saída</p>
          <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
            {JSON.stringify(execution.outputSnapshot, null, 2)}
          </pre>
        </div>
      )}

      {execution.status === "completed" && (
        <ApproveRejectActions
          executionId={execution.id}
          onApproved={(d) => setExecution(d as ExecutionDetailData)}
          onRejected={(d) => setExecution(d as ExecutionDetailData)}
        />
      )}
    </div>
  );
}
