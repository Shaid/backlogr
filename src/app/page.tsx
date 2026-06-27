import { ArrowDown, ArrowUp, ArrowUpDown, LayoutGrid, List, PackageOpen, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ItemCard } from "@/components/item-card";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { itemWithRelationsInclude } from "@/lib/items";
import { canPerform } from "@/lib/permissions";

type SortKey = "name" | "category" | "condition" | "value" | "location" | "createdAt";
type SortDirection = "asc" | "desc";

const SORTABLE_COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "condition", label: "Condition" },
  { key: "value", label: "Value" },
  { key: "location", label: "Location" },
  { key: "createdAt", label: "Date Added" },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    view?: string;
    sortBy?: string;
    sortDirection?: string;
  }>;
}) {
  const user = await requireCurrentUser();
  const {
    q,
    sortBy: rawSortBy,
    sortDirection: rawSortDirection,
    view: rawView,
  } = await searchParams;
  const view = rawView === "list" ? "list" : "grid";
  const sortBy = isSortKey(rawSortBy) ? rawSortBy : "createdAt";
  const sortDirection = rawSortDirection === "asc" ? "asc" : "desc";
  const canCreate = canPerform(user.role, "create", undefined, user.id);

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
  const visibleItems = view === "list" ? sortItems(items, sortBy, sortDirection) : items;
  const buildHref = (
    updates: Partial<Record<"q" | "view" | "sortBy" | "sortDirection", string | null>>,
  ) =>
    buildCatalogHref({
      q: q ?? null,
      view,
      sortBy,
      sortDirection,
      ...updates,
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Suspense>
          <SearchBar />
        </Suspense>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Button
            render={<Link href={buildHref({ view: "grid", sortBy: null, sortDirection: null })} />}
            variant={view === "grid" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
          >
            <LayoutGrid className="size-4" />
            Grid
          </Button>
          <Button
            render={<Link href={buildHref({ view: "list" })} />}
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
          >
            <List className="size-4" />
            List
          </Button>
        </div>
      </div>

      {q && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {visibleItems.length} result{visibleItems.length !== 1 ? "s" : ""} for &ldquo;
            <span className="font-medium text-foreground">{q}</span>&rdquo;
          </p>
          <Button
            render={<Link href={buildHref({ q: null })} />}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            Clear search
          </Button>
        </div>
      )}

      {visibleItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center sm:py-28">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <PackageOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-1">{q ? "No items found" : "No items yet"}</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            {q
              ? "Try a different search term or clear your search."
              : "Start cataloging your belongings by adding your first item."}
          </p>
          {!q && canCreate && (
            <Button render={<Link href="/items/new" />} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add your first item
            </Button>
          )}
        </div>
      ) : view === "list" ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {SORTABLE_COLUMNS.map((column) => (
                    <th key={column.key} className="px-4 py-3 font-medium">
                      <Link
                        href={buildHref({
                          sortBy: column.key,
                          sortDirection:
                            sortBy === column.key && sortDirection === "asc" ? "desc" : "asc",
                        })}
                        className="inline-flex items-center gap-1.5 hover:text-primary"
                      >
                        {column.label}
                        <SortIcon active={sortBy === column.key} direction={sortDirection} />
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleItems.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/items/${item.id}`} className="hover:text-primary">
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.category || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.condition || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.value != null ? formatCurrency(item.value) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.location || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visibleItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) {
    return <ArrowUpDown className="size-3.5 text-muted-foreground" />;
  }

  return direction === "asc" ? (
    <ArrowUp className="size-3.5 text-primary" />
  ) : (
    <ArrowDown className="size-3.5 text-primary" />
  );
}

function isSortKey(value?: string): value is SortKey {
  return SORTABLE_COLUMNS.some((column) => column.key === value);
}

function buildCatalogHref(
  params: Partial<Record<"q" | "view" | "sortBy" | "sortDirection", string | null>>,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `/?${queryString}` : "/";
}

function sortItems<T extends { name: string } & { [K in SortKey]: string | number | Date | null }>(
  items: T[],
  sortBy: SortKey,
  sortDirection: SortDirection,
) {
  const sorted = [...items].sort((left, right) => {
    const leftValue = normalizeSortValue(left[sortBy]);
    const rightValue = normalizeSortValue(right[sortBy]);

    if (leftValue < rightValue) {
      return sortDirection === "asc" ? -1 : 1;
    }

    if (leftValue > rightValue) {
      return sortDirection === "asc" ? 1 : -1;
    }

    return String(left.name).localeCompare(String(right.name));
  });

  return sorted;
}

function normalizeSortValue(value: string | number | Date | null) {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    return value.toLocaleLowerCase();
  }

  return value;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
