import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemForm } from "@/components/item-form";
import { updateItem } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { itemWithRelationsInclude } from "@/lib/items";

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: itemWithRelationsInclude,
  });

  if (!item) notFound();

  const updateWithId = updateItem.bind(null, item.id);

  return (
    <div className="max-w-2xl mx-auto py-2 sm:py-4">
      <Link
        href={`/items/${item.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to item
      </Link>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">Edit Item</h1>
      <ItemForm item={item} action={updateWithId} submitLabel="Save Changes" />
    </div>
  );
}
