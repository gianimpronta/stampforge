import { CollectionList } from "@/components/stampforge/CollectionList";

export const metadata = {
  title: "Coleções | StampForge",
};

export default function CollectionsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Coleções</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gerencie suas coleções de design
        </p>
      </div>
      <CollectionList />
    </main>
  );
}
