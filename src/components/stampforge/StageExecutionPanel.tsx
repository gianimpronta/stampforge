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
  readonly execution: StageExecutionData;
  readonly stageName: string;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onActionDone: () => void;
}

export const STATUS_LABELS: Record<StageExecutionStatus, string> = {
  running: "Executando",
  completed: "Concluído",
  approved: "Aprovado",
  rejected: "Rejeitado",
  failed: "Falhou",
};

export const STATUS_VARIANTS: Record<
  StageExecutionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  running: "secondary",
  completed: "default",
  approved: "default",
  rejected: "destructive",
  failed: "destructive",
};

function parseContent(output: Record<string, unknown>): Record<string, unknown> | null {
  const content = output.content;
  if (typeof content !== "string") return null;
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function formatLabel(key: string): string {
  return key
    .replaceAll(/([A-Z])/g, " $1")
    .replaceAll(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function ValueRenderer({ value }: { readonly value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">—</span>;
  }

  if (typeof value === "boolean") {
    return <span>{value ? "Sim" : "Não"}</span>;
  }

  if (typeof value === "number") {
    return <span className="font-mono">{value}</span>;
  }

  if (typeof value === "string") {
    return <span>{value}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground italic">Nenhum</span>;

    if (typeof value[0] === "string" || typeof value[0] === "number") {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item) => (
            <span key={String(item)} className="bg-muted rounded px-2 py-0.5 text-xs">
              {String(item)}
            </span>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {value.map((item) => (
          <div key={JSON.stringify(item)} className="bg-muted rounded-md p-2">
            {typeof item === "object" && item !== null ? (
              <ObjectRenderer data={item as Record<string, unknown>} />
            ) : (
              <span>{String(item)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    return <ObjectRenderer data={value as Record<string, unknown>} />;
  }

  return <span>{typeof value !== "object" ? String(value) : JSON.stringify(value)}</span>;
}

function ObjectRenderer({ data }: { readonly data: Record<string, unknown> }) {
  return (
    <div className="space-y-1">
      {Object.entries(data).map(([key, val]) => (
        <div key={key} className="text-xs">
          <span className="text-muted-foreground font-medium">{formatLabel(key)}: </span>
          <ValueRenderer value={val} />
        </div>
      ))}
    </div>
  );
}

function OutputDisplay({ output }: { readonly output: Record<string, unknown> }) {
  const parsed = parseContent(output);
  const provider = output.provider as string | undefined;
  const model = output.model as string | undefined;
  const usage = output.usage as { inputTokens?: number; outputTokens?: number } | undefined;

  return (
    <div className="space-y-3">
      {provider && (
        <div className="flex flex-wrap gap-3 text-xs">
          {model && (
            <span className="text-muted-foreground">
              Modelo: <span className="font-mono">{model}</span>
            </span>
          )}
          {usage && (
            <span className="text-muted-foreground">
              Tokens: {usage.inputTokens ?? 0} in / {usage.outputTokens ?? 0} out
            </span>
          )}
        </div>
      )}

      {parsed ? (
        <div className="bg-muted space-y-3 rounded-md p-3">
          {Object.entries(parsed).map(([key, val]) => (
            <div key={key}>
              <p className="mb-1 text-xs font-semibold">{formatLabel(key)}</p>
              <div className="text-sm">
                <ValueRenderer value={val} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
          {typeof output.content === "string" ? output.content : JSON.stringify(output, null, 2)}
        </pre>
      )}
    </div>
  );
}

interface ApproveRejectActionsProps {
  readonly executionId: string;
  readonly onApproved: (updated: unknown) => void;
  readonly onRejected: (updated: unknown) => void;
}

export function ApproveRejectActions({
  executionId,
  onApproved,
  onRejected,
}: ApproveRejectActionsProps) {
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
        `/api/pipeline/executions/${executionId}/approve`,
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
      const updated = await res.json();
      onApproved(updated);
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
        `/api/pipeline/executions/${executionId}/reject`,
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
      const updated = await res.json();
      onRejected(updated);
      setShowRejectForm(false);
      setRejectReason("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao reprovar");
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div className="space-y-2 border-t pt-4">
      {actionError && (
        <p className="text-destructive text-sm">{actionError}</p>
      )}
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
  );
}

export function StageExecutionPanel({
  execution,
  stageName,
  open,
  onClose,
  onActionDone,
}: StageExecutionPanelProps) {
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

          <details className="text-xs">
            <summary className="text-muted-foreground cursor-pointer font-medium">
              Snapshot de entrada (técnico)
            </summary>
            <pre className="bg-muted mt-1 overflow-x-auto rounded-md p-3">
              {JSON.stringify(execution.inputSnapshot, null, 2)}
            </pre>
          </details>

          {execution.outputSnapshot !== null && (
            <div>
              <p className="text-muted-foreground mb-1 font-medium">
                Resultado
              </p>
              <OutputDisplay output={execution.outputSnapshot} />
            </div>
          )}

          {execution.status === "completed" && (
            <ApproveRejectActions
              executionId={execution.id}
              onApproved={() => { onActionDone(); onClose(); }}
              onRejected={() => { onActionDone(); onClose(); }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
