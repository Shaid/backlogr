import { createItem } from "@/lib/actions";
import { ItemForm } from "@/components/item-form";

export default function NewItemPage() {
  return (
    <div className="py-4">
      <h1 className="text-2xl font-bold mb-6">Add New Item</h1>
      <ItemForm action={createItem} submitLabel="Add Item" />
    </div>
  );
}
