"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface CollectionContextEntry {
  executionId: string;
  styleIndex?: number;
}

type CollectionContext = Record<string, CollectionContextEntry | undefined>;

interface StageExecution {
  id: string;
  stageKey: string;
  status: string;
  startedAt: string;
}

const COLLECTION_STAGE_KEYS = [
  "collection-briefing",
  "game-universe-extraction",
  "visual-style-definition",
] as const;

const STAGE_LABELS: Record<string, string> = {
  "collection-briefing": "Briefing da Coleção",
  "game-universe-extraction": "Extração do Universo",
  "visual-style-definition": "Estilo Visual",
};

interface CollectionContextPanelProps {
  readonly collectionId: string;
  readonly designItemId: string;
  readonly onContextUpdated?: () => void;
}

export function CollectionContextPanel({
  collectionId,
  designItemId,
  onContextUpdated,
}: CollectionContextPanelProps) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<CollectionContext>({});
  const [collectionExecs, setCollectionExecs] = useState<StageExecution[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<CollectionContext>({});

  const fetchData = useCallback(async () => {
    const [ctxRes, execsRes] = await Promise.all([
      fetch(
        `/api/collections/${collectionId}/design-items/${designItemId}/collection-context`,
      ),
      fetch(`/api/pipeline/timeline/${collectionId}`),
    ]);

    if (ctxRes.ok) {
      const data: CollectionContext = await ctxRes.json();
      setContext(data);
      setDraft(data);
    }
    if (execsRes.ok) {
      const data: StageExecution[] = await execsRes.json();
      setCollectionExecs(data);
    }
  }, [collectionId, designItemId]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  function getApprovedExecsForStage(stageKey: string): StageExecution[] {
    return collectionExecs.filter(
      (e) => e.stageKey === stageKey && e.status === "approved",
    );
  }

  function handleEntryChange(
    stageKey: string,
    field: "executionId" | "styleIndex",
    value: string,
  ) {
    setDraft((prev) => {
      const existing = prev[stageKey] ?? { executionId: "" };
      if (field === "executionId") {
        return {
          ...prev,
          [stageKey]: value ? { ...existing, executionId: value } : undefined,
        };
      }
      const numVal = parseInt(value, 10);
      return {
        ...prev,
        [stageKey]: {
          ...existing,
          styleIndex: isNaN(numVal) ? undefined : numVal,
        },
      };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body: CollectionContext = {};
      for (const [k, v] of Object.entries(draft)) {
        if (v?.executionId) body[k] = v;
      }
      const res = await fetch(
        `/api/collections/${collectionId}/design-items/${designItemId}/collection-context`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao salvar contexto");
      }
      setContext(body);
      setOpen(false);
      onContextUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const configuredCount = COLLECTION_STAGE_KEYS.filter(
    (k) => context[k]?.executionId,
  ).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Contexto da Coleção
          {configuredCount > 0 && (
            <Badge className="ml-2" variant="secondary">
              {configuredCount}/{COLLECTION_STAGE_KEYS.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Contexto da Coleção</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Selecione as execuções aprovadas da coleção que este item de design
          usará como base.
        </p>

        <div className="space-y-6 py-2">
          {COLLECTION_STAGE_KEYS.map((stageKey) => {
            const approvedExecs = getApprovedExecsForStage(stageKey);
            const currentEntry = draft[stageKey];

            return (
              <div key={stageKey} className="space-y-2">
                <Label className="font-medium">{STAGE_LABELS[stageKey]}</Label>
                {approvedExecs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Nenhuma execução aprovada encontrada para este estágio.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <select
                      className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                      value={currentEntry?.executionId ?? ""}
                      onChange={(e) =>
                        handleEntryChange(stageKey, "executionId", e.target.value)
                      }
                    >
                      <option value="">— Selecionar execução —</option>
                      {approvedExecs.map((exec) => (
                        <option key={exec.id} value={exec.id}>
                          {exec.id.slice(0, 8)}...{" "}
                          {new Date(exec.startedAt).toLocaleDateString("pt-BR")}
                        </option>
                      ))}
                    </select>
                    {stageKey === "visual-style-definition" &&
                      currentEntry?.executionId && (
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`style-index-${stageKey}`}
                            className="text-sm"
                          >
                            Índice do estilo
                          </Label>
                          <Input
                            id={`style-index-${stageKey}`}
                            type="number"
                            min={0}
                            className="w-20"
                            value={currentEntry.styleIndex ?? ""}
                            onChange={(e) =>
                              handleEntryChange(
                                stageKey,
                                "styleIndex",
                                e.target.value,
                              )
                            }
                            placeholder="0"
                          />
                        </div>
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
