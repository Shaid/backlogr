import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { SearchBar } from "@/components/search-bar";
import { ItemCard } from "@/components/item-card";

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
        include: { tags: { include: { tag: true } } },
        orderBy: { updatedAt: "desc" },
      })
    : await prisma.item.findMany({
        include: { tags: { include: { tag: true } } },
        orderBy: { updatedAt: "desc" },
      });

  return (
    <div className="space-y-6">
      <Suspense>
        <SearchBar />
      </Suspense>

      {q && (
        <p className="text-sm text-muted-foreground">
          {items.length} result{items.length !== 1 ? "s" : ""} for &ldquo;{q}&rdquo;
        </p>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">
            {q ? "No items found." : "No items yet. Add your first item!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

