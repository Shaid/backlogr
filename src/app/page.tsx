import { PackageOpen, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ItemCard } from "@/components/item-card";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { itemWithRelationsInclude } from "@/lib/items";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const items = q
    ? await prisma.item.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
            { category: { contains: q } },
            { barcode: { contains: q } },
            { location: { contains: q } },
            {
              tags: {
                some: {
                  tag: { name: { contains: q } },
                },
              },
            },
          ],
        },
        include: itemWithRelationsInclude,
        orderBy: { updatedAt: "desc" },
      })
    : await prisma.item.findMany({
        include: itemWithRelationsInclude,
        orderBy: { updatedAt: "desc" },
      });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Suspense>
          <SearchBar />
        </Suspense>
      </div>

      {q && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {items.length} result{items.length !== 1 ? "s" : ""} for &ldquo;
            <span className="font-medium text-foreground">{q}</span>&rdquo;
          </p>
          <Button render={<Link href="/" />} variant="ghost" size="sm" className="text-xs">
            Clear search
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 sm:py-28 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-6">
            <PackageOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-1">{q ? "No items found" : "No items yet"}</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            {q
              ? "Try a different search term or clear your search."
              : "Start cataloging your belongings by adding your first item."}
          </p>
          {!q && (
            <Button render={<Link href="/items/new" />} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add your first item
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
