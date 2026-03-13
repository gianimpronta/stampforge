"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export type StageExecutionStatus =
  | "running"
  | "completed"
  | "approved"
  | "rejected"
  | "failed";

export interface StageExecutionData {
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

interface StageExecutionPanelProps {
  execution: StageExecutionData;
  stageName: string;
  open: boolean;
  onClose: () => void;
  onActionDone: () => void;
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

export function StageExecutionPanel({
  execution,
  stageName,
  open,
  onClose,
  onActionDone,
}: StageExecutionPanelProps) {
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
      onActionDone();
      onClose();
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
      onActionDone();
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao reprovar");
    } finally {
      setRejecting(false);
      setShowRejectForm(false);
      setRejectReason("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {stageName}
            <Badge variant={STATUS_VARIANTS[execution.status]}>
              {STATUS_LABELS[execution.status]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground font-medium">Iniciado em</p>
              <p>
                {new Date(execution.startedAt).toLocaleString("pt-BR")}
              </p>
            </div>
            {execution.completedAt && (
              <div>
                <p className="text-muted-foreground font-medium">Concluído em</p>
                <p>
                  {new Date(execution.completedAt).toLocaleString("pt-BR")}
                </p>
              </div>
            )}
            {execution.approvedAt && (
              <div>
                <p className="text-muted-foreground font-medium">Aprovado em</p>
                <p>
                  {new Date(execution.approvedAt).toLocaleString("pt-BR")}
                </p>
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
                <p>
                  {new Date(execution.rejectedAt).toLocaleString("pt-BR")}
                </p>
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
              <p className="text-destructive">{execution.rejectionReason}</p>
            </div>
          )}

          {execution.failureReason && (
            <div>
              <p className="text-muted-foreground font-medium">Erro técnico</p>
              <p className="text-destructive">{execution.failureReason}</p>
            </div>
          )}

          <div>
            <p className="text-muted-foreground mb-1 font-medium">
              Snapshot de entrada
            </p>
            <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
              {JSON.stringify(execution.inputSnapshot, null, 2)}
            </pre>
          </div>

          {execution.outputSnapshot !== null && (
            <div>
              <p className="text-muted-foreground mb-1 font-medium">
                Snapshot de saída
              </p>
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
                  <Button
                    size="sm"
                    disabled={approving}
                    onClick={handleApprove}
                  >
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
      </DialogContent>
    </Dialog>
  );
}
