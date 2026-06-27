"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";

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

  return (
    <form onSubmit={handleSearch} className="w-full">
      <Input
        type="search"
        placeholder="Search items by name, category, tags, barcode..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full h-11"
      />
    </form>
  );
}
