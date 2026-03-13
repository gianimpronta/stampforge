"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Collection {
  id: string;
  name: string;
  briefing: string;
  createdAt: string;
}

export function CollectionList() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [briefing, setBriefing] = useState("");

  async function fetchCollections() {
    try {
      const res = await fetch("/api/collections");
      if (!res.ok) throw new Error("Falha ao carregar coleções");
      const data = await res.json();
      setCollections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCollections();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, briefing }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao criar coleção");
      }
      setName("");
      setBriefing("");
      setOpen(false);
      await fetchCollections();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao criar coleção");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Carregando coleções...</p>;
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {collections.length === 0
            ? "Nenhuma coleção criada ainda."
            : `${collections.length} coleção${collections.length > 1 ? "ões" : ""}`}
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Nova Coleção</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Coleção</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Coleção Verão 2026"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="briefing">Briefing</Label>
                <textarea
                  id="briefing"
                  value={briefing}
                  onChange={(e) => setBriefing(e.target.value)}
                  placeholder="Descreva a direção criativa desta coleção..."
                  required
                  rows={4}
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Criando..." : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {collections.length === 0 ? (
        <div className="border-border rounded-lg border-2 border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            Crie sua primeira coleção para começar.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.id}`}
              className="block"
            >
              <Card className="hover:border-primary h-full transition-colors">
                <CardHeader>
                  <CardTitle className="text-base">{collection.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-muted-foreground line-clamp-3 text-sm">
                    {collection.briefing}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Criada em{" "}
                    {new Date(collection.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
