"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  StageExecutionPanel,
  type StageExecutionData,
  type StageExecutionStatus,
} from "./StageExecutionPanel";

interface CatalogStage {
  key: string;
  name: string;
  scope: string;
  order: number;
  dependencies: string[];
}

interface PipelineTimelineProps {
  designItemId: string;
  collectionId: string;
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

export function PipelineTimeline({ designItemId, collectionId }: PipelineTimelineProps) {
  const [catalog, setCatalog] = useState<CatalogStage[]>([]);
  const [executions, setExecutions] = useState<StageExecutionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] =
    useState<StageExecutionData | null>(null);
  const [selectedStageName, setSelectedStageName] = useState<string>("");
  const [panelOpen, setPanelOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [catalogRes, itemTimelineRes, collectionTimelineRes] =
        await Promise.all([
          fetch("/api/pipeline/stages"),
          fetch(`/api/pipeline/timeline/${designItemId}`),
          fetch(`/api/pipeline/timeline/${collectionId}`),
        ]);

      if (!catalogRes.ok) throw new Error("Falha ao carregar catálogo");
      if (!itemTimelineRes.ok) throw new Error("Falha ao carregar timeline do item");
      if (!collectionTimelineRes.ok)
        throw new Error("Falha ao carregar timeline da coleção");

      const catalogData: CatalogStage[] = await catalogRes.json();
      const itemExecs: StageExecutionData[] = await itemTimelineRes.json();
      const collectionExecs: StageExecutionData[] =
        await collectionTimelineRes.json();

      setCatalog(catalogData.sort((a, b) => a.order - b.order));
      setExecutions([...collectionExecs, ...itemExecs]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [designItemId, collectionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function getLatestExecutionForStage(
    stageKey: string,
  ): StageExecutionData | undefined {
    const stageExecutions = executions.filter((e) => e.stageKey === stageKey);
    if (stageExecutions.length === 0) return undefined;
    return stageExecutions.sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )[0];
  }

  function getApprovedStageKeys(): string[] {
    const approvedKeys = new Set<string>();
    for (const exec of executions) {
      if (exec.status === "approved") {
        approvedKeys.add(exec.stageKey);
      }
    }
    return Array.from(approvedKeys);
  }

  function isStageEligible(stage: CatalogStage): boolean {
    if (stage.dependencies.length === 0) return true;
    const approved = new Set(getApprovedStageKeys());
    return stage.dependencies.every((dep) => approved.has(dep));
  }

  function getTargetIdForStage(stageKey: string): string {
    const stage = catalog.find((s) => s.key === stageKey);
    return stage?.scope === "collection" ? collectionId : designItemId;
  }

  async function handleTrigger(stageKey: string) {
    setTriggering(stageKey);
    try {
      const targetId = getTargetIdForStage(stageKey);
      const res = await fetch("/api/pipeline/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageKey, targetId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao executar estágio");
      }
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao executar estágio");
    } finally {
      setTriggering(null);
    }
  }

  function handleOpenPanel(execution: StageExecutionData, stageName: string) {
    setSelectedExecution(execution);
    setSelectedStageName(stageName);
    setPanelOpen(true);
  }

  if (loading) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        Carregando pipeline...
      </p>
    );
  }

  if (error) {
    return <p className="text-destructive py-8 text-center">{error}</p>;
  }

  return (
    <div className="space-y-2">
      <h2 className="mb-4 text-lg font-semibold">Estágios do Pipeline</h2>

      {catalog.map((stage) => {
        const execution = getLatestExecutionForStage(stage.key);
        const eligible = isStageEligible(stage);
        const isTriggering = triggering === stage.key;
        const hasExecution = execution !== undefined;
        const isRunning = execution?.status === "running";

        return (
          <Card
            key={stage.key}
            className={`p-4 transition-opacity ${!eligible && !hasExecution ? "opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="text-muted-foreground w-6 shrink-0 text-xs font-mono">
                  {String(stage.order).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{stage.name}</p>
                  {!eligible && !hasExecution && (
                    <p className="text-muted-foreground text-xs">
                      Aguardando aprovação de dependências
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {hasExecution ? (
                  <>
                    <Badge variant={STATUS_VARIANTS[execution!.status]}>
                      {STATUS_LABELS[execution!.status]}
                    </Badge>
                    {!isRunning && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleOpenPanel(execution!, stage.name)
                          }
                        >
                          Detalhes
                        </Button>
                        <Link href={`/executions/${execution!.id}`}>
                          <Button variant="ghost" size="sm">
                            Ver execução
                          </Button>
                        </Link>
                      </>
                    )}
                    {stage.key === "visual-variation-generation" &&
                      (execution!.status === "completed" ||
                        execution!.status === "approved") && (
                        <Link
                          href={`/collections/${collectionId}/items/${designItemId}/images`}
                        >
                          <Button variant="outline" size="sm">
                            Imagens
                          </Button>
                        </Link>
                      )}
                    {(execution!.status === "completed" ||
                      execution!.status === "approved") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isTriggering}
                        onClick={() => handleTrigger(stage.key)}
                      >
                        {isTriggering ? "Executando..." : "Re-executar"}
                      </Button>
                    )}
                    {execution!.status === "rejected" && (
                      <Button
                        size="sm"
                        disabled={isTriggering}
                        onClick={() => handleTrigger(stage.key)}
                      >
                        {isTriggering ? "Executando..." : "Executar novamente"}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Badge variant="outline">Pendente</Badge>
                    {eligible && (
                      <Button
                        size="sm"
                        disabled={isTriggering}
                        onClick={() => handleTrigger(stage.key)}
                      >
                        {isTriggering ? "Executando..." : "Executar"}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {selectedExecution && (
        <StageExecutionPanel
          execution={selectedExecution}
          stageName={selectedStageName}
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          onActionDone={fetchData}
        />
      )}
    </div>
  );
}
