import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PipelineTimeline } from "@/components/stampforge/PipelineTimeline";
import { designItemRepo } from "@/lib/server/dependencies";

interface PipelinePageProps {
  params: Promise<{ collectionId: string; designItemId: string }>;
}

export default async function PipelinePage({ params }: PipelinePageProps) {
  const { collectionId, designItemId } = await params;
  const designItem = await designItemRepo.findById(designItemId);

  if (!designItem) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link href={`/collections/${collectionId}`}>
          <Button variant="ghost" size="sm" className="-ml-2 mb-4">
            ← Coleção
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{designItem.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">Pipeline de produção</p>
          </div>
          <Badge variant="secondary">Item de Design</Badge>
        </div>
      </div>

      <PipelineTimeline designItemId={designItemId} collectionId={collectionId} />
    </main>
  );
}
