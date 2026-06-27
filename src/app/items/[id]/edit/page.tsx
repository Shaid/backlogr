import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateItem } from "@/lib/actions";
import { ItemForm } from "@/components/item-form";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } } },
  });

  if (!item) notFound();

  const updateWithId = updateItem.bind(null, item.id);

  return (
    <div className="py-4">
      <h1 className="text-2xl font-bold mb-6">Edit Item</h1>
      <ItemForm item={item} action={updateWithId} submitLabel="Save Changes" />
    </div>
  );
}
