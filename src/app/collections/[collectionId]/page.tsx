import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DesignItemList } from "@/components/stampforge/DesignItemList";

interface CollectionDetailPageProps {
  params: Promise<{ collectionId: string }>;
}

interface CollectionData {
  id: string;
  name: string;
  briefing: string;
  createdAt: string;
}

async function fetchCollection(collectionId: string): Promise<CollectionData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/collections/${collectionId}`, {
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Erro ao carregar coleção");
    return res.json();
  } catch {
    return null;
  }
}

export default async function CollectionDetailPage({
  params,
}: CollectionDetailPageProps) {
  const { collectionId } = await params;
  const collection = await fetchCollection(collectionId);

  if (!collection) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-2">
        <Link href="/collections">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2">
            ← Coleções
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{collection.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Criada em{" "}
              {new Date(collection.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <Badge variant="secondary">Coleção</Badge>
        </div>
      </div>

      <div className="bg-muted/50 mb-8 rounded-lg p-4">
        <p className="text-sm font-medium">Briefing</p>
        <p className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">
          {collection.briefing}
        </p>
      </div>

      <DesignItemList collectionId={collectionId} />
    </main>
  );
}
