"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface GeneratedImageData {
  id: string;
  designItemId: string;
  sourceExecutionId: string;
  filePath: string;
  promptUsed: string;
  provider: string;
  model: string;
  metadata: Record<string, unknown>;
  status: "pending" | "ready" | "failed";
  createdAt: string;
}

interface ImageGalleryProps {
  designItemId: string;
  collectionId: string;
}

const STATUS_LABELS: Record<GeneratedImageData["status"], string> = {
  pending: "Pendente",
  ready: "Pronta",
  failed: "Falhou",
};

const STATUS_VARIANTS: Record<
  GeneratedImageData["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  ready: "default",
  failed: "destructive",
};

export function ImageGallery({ designItemId, collectionId }: ImageGalleryProps) {
  const [images, setImages] = useState<GeneratedImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch(`/api/design-items/${designItemId}/images`);
      if (!res.ok) throw new Error("Falha ao carregar imagens");
      const data: GeneratedImageData[] = await res.json();
      setImages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [designItemId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  async function handleGenerate() {
    const executionId = prompt("ID da execução de origem:");
    if (!executionId?.trim()) return;
    const promptText = prompt("Prompt para geração:");
    if (!promptText?.trim()) return;

    setGenerating(true);
    try {
      const res = await fetch(`/api/design-items/${designItemId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          executionId: executionId.trim(),
          prompt: promptText.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao gerar imagens");
      }
      await fetchImages();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao gerar imagens");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        Carregando imagens...
      </p>
    );
  }

  if (error) {
    return <p className="text-destructive py-8 text-center">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {images.length} {images.length === 1 ? "imagem" : "imagens"} gerada
          {images.length !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-2">
          <Link href={`/collections/${collectionId}/items/${designItemId}/pipeline`}>
            <Button variant="outline" size="sm">
              ← Pipeline
            </Button>
          </Link>
          <Button size="sm" disabled={generating} onClick={handleGenerate}>
            {generating ? "Gerando..." : "Gerar Variações"}
          </Button>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="border-border rounded-lg border-2 border-dashed py-16 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhuma imagem gerada ainda.
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Execute o estágio{" "}
            <strong>visual-variation-generation</strong> no pipeline para gerar imagens.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <Card key={image.id} className="overflow-hidden">
              {image.status === "ready" ? (
                <img
                  src={`/api/assets/${image.filePath}`}
                  alt={image.promptUsed}
                  className="h-48 w-full object-cover"
                />
              ) : (
                <div className="bg-muted flex h-48 items-center justify-center">
                  <p className="text-muted-foreground text-xs">
                    {image.status === "pending" ? "Gerando..." : "Falhou"}
                  </p>
                </div>
              )}
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">
                    {image.provider} / {image.model}
                  </p>
                  <Badge variant={STATUS_VARIANTS[image.status]} className="shrink-0">
                    {STATUS_LABELS[image.status]}
                  </Badge>
                </div>
                <p className="text-muted-foreground line-clamp-2 text-xs">
                  {image.promptUsed}
                </p>
                <div className="pt-1">
                  <Link href={`/executions/${image.sourceExecutionId}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-0 py-0 text-xs underline"
                    >
                      Execução de origem →
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
