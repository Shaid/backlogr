"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetriggerButton({ itemId }: { itemId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRetrigger() {
    setLoading(true);
    try {
      await fetch(`/api/items/${itemId}/enrich`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRetrigger}
      disabled={loading}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
      title="Re-run enrichment"
    >
      <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
      Retry
    </button>
  );
}
