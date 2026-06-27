"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/?${params.toString()}`);
  }

  function handleClear() {
    setQuery("");
    router.push("/");
  }

  return (
    <form onSubmit={handleSearch} className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        placeholder="Search by name, category, tags, barcode..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full h-11 pl-10 pr-10 rounded-xl bg-muted/50 border-transparent focus:border-primary/30 focus:bg-background transition-all"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  );
}
