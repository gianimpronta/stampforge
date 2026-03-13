"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 mb-4"
      onClick={() => router.back()}
    >
      ← Voltar
    </Button>
  );
}
