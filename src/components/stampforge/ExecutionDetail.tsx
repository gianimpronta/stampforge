"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type StageExecutionStatus =
  | "running"
  | "completed"
  | "approved"
  | "rejected"
  | "failed";

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
  execution: ExecutionDetailData;
}

const STATUS_LABELS: Record<StageExecutionStatus, string> = {
  running: "Executando",
  completed: "Concluído",
  approved: "Aprovado",
  rejected: "Rejeitado",
  failed: "Falhou",
};

const STATUS_VARIANTS: Record<
  StageExecutionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  running: "secondary",
  completed: "default",
  approved: "default",
  rejected: "destructive",
  failed: "destructive",
};

export function ExecutionDetail({ execution: initialExecution }: ExecutionDetailProps) {
  const [execution, setExecution] = useState<ExecutionDetailData>(initialExecution);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleApprove() {
    setApproving(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/pipeline/executions/${execution.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actorId: "operator" }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao aprovar");
      }
      const updated: ExecutionDetailData = await res.json();
      setExecution(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao aprovar");
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/pipeline/executions/${execution.id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actorId: "operator", reason: rejectReason }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao reprovar");
      }
      const updated: ExecutionDetailData = await res.json();
      setExecution(updated);
      setShowRejectForm(false);
      setRejectReason("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao reprovar");
    } finally {
      setRejecting(false);
    }
  }

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
            {String(promptUsed)}
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

      {actionError && (
        <p className="text-destructive text-sm">{actionError}</p>
      )}

      {execution.status === "completed" && (
        <div className="space-y-2 border-t pt-4">
          {showRejectForm ? (
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Motivo da reprovação</Label>
              <Input
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Descreva o motivo..."
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!rejectReason.trim() || rejecting}
                  onClick={handleReject}
                >
                  {rejecting ? "Reprovando..." : "Confirmar Reprovação"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectReason("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" disabled={approving} onClick={handleApprove}>
                {approving ? "Aprovando..." : "Aprovar"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectForm(true)}
              >
                Reprovar
              </Button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
