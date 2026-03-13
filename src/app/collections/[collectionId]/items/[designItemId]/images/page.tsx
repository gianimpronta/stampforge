import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageGallery } from "@/components/stampforge/ImageGallery";

interface ImagesPageProps {
  params: Promise<{ collectionId: string; designItemId: string }>;
}

interface DesignItemData {
  id: string;
  collectionId: string;
  name: string;
  createdAt: string;
}

async function fetchDesignItem(
  collectionId: string,
  designItemId: string,
): Promise<DesignItemData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(
      `${baseUrl}/api/collections/${collectionId}/design-items/${designItemId}`,
      { cache: "no-store" },
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Erro ao carregar item de design");
    return res.json();
  } catch {
    return null;
  }
}

export default async function ImagesPage({ params }: ImagesPageProps) {
  const { collectionId, designItemId } = await params;
  const designItem = await fetchDesignItem(collectionId, designItemId);

  if (!designItem) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <Link href={`/collections/${collectionId}/items/${designItemId}/pipeline`}>
          <Button variant="ghost" size="sm" className="-ml-2 mb-4">
            ← Pipeline
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Imagens Geradas</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {designItem.name}
            </p>
          </div>
          <Badge variant="secondary">Item de Design</Badge>
        </div>
      </div>

      <ImageGallery designItemId={designItemId} collectionId={collectionId} />
    </main>
  );
}
