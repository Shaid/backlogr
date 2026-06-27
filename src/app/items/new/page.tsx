import { createItem } from "@/lib/actions";
import { ItemForm } from "@/components/item-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewItemPage() {
  return (
    <div className="max-w-2xl mx-auto py-2 sm:py-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to catalog
      </Link>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">
        Add New Item
      </h1>
      <ItemForm action={createItem} submitLabel="Add Item" />
    </div>
  );
}
