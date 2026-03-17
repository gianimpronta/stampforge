"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface GeneratedImageData {
  id: string;
  readonly designItemId: string;
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
  readonly designItemId: string;
  readonly collectionId: string;
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
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateExecutionId, setGenerateExecutionId] = useState("");
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generateError, setGenerateError] = useState<string | null>(null);

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
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(`/api/design-items/${designItemId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          executionId: generateExecutionId.trim(),
          prompt: generatePrompt.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao gerar imagens");
      }
      setGenerateExecutionId("");
      setGeneratePrompt("");
      setGenerateOpen(false);
      await fetchImages();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Erro ao gerar imagens");
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
          <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Gerar Variações</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerar Variações</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gen-execution-id">ID da execução de origem</Label>
                  <Input
                    id="gen-execution-id"
                    value={generateExecutionId}
                    onChange={(e) => setGenerateExecutionId(e.target.value)}
                    placeholder="uuid da execução..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gen-prompt">Prompt para geração</Label>
                  <Input
                    id="gen-prompt"
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    placeholder="Descreva a imagem..."
                  />
                </div>
                {generateError && (
                  <p className="text-destructive text-sm">{generateError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setGenerateOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    disabled={generating || !generateExecutionId.trim() || !generatePrompt.trim()}
                    onClick={handleGenerate}
                  >
                    {generating ? "Gerando..." : "Gerar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                <div className="relative h-48 w-full">
                  <Image
                    src={`/api/assets/${image.filePath}`}
                    alt={image.promptUsed}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
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
