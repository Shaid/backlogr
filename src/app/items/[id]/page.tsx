import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { deleteItem } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Pencil,
  MapPin,
  Calendar,
  DollarSign,
  Barcode,
  Package,
  Layers,
  Sparkles,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { DeleteButton } from "./delete-button";

export default async function ItemDetailPage({
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

  const deleteWithId = deleteItem.bind(null, item.id);

  return (
    <div className="max-w-2xl mx-auto py-2 sm:py-4 space-y-6">
      {/* Navigation */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to catalog
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
            {item.name}
          </h1>
          {item.category && (
            <p className="text-sm text-muted-foreground">{item.category}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href={`/items/${item.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          </Link>
          <DeleteButton deleteAction={deleteWithId} />
        </div>
      </div>

      {/* Enrichment status */}
      {item.enrichStatus === "pending" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-3 border border-border">
          <Loader2 className="w-4 h-4 animate-spin" />
          Looking up product details...
        </div>
      )}
      {item.enrichStatus === "complete" && (
        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 rounded-xl px-4 py-3 border border-green-500/20">
          <Sparkles className="w-4 h-4" />
          Product details enriched automatically
        </div>
      )}

      {/* Photo */}
      {item.photo ? (
        <div className="rounded-2xl overflow-hidden border border-border">
          <img
            src={item.photo}
            alt={item.name}
            className="w-full max-h-[28rem] object-contain bg-muted/30"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-muted/30 flex items-center justify-center h-48">
          <Package className="w-12 h-12 text-muted-foreground/20" />
        </div>
      )}

      {/* Description */}
      {item.description && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">Description</p>
          <p className="text-sm leading-relaxed">{item.description}</p>
        </div>
      )}

      {/* Metadata grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <MetaField
          icon={<Layers className="w-4 h-4" />}
          label="Quantity"
          value={String(item.quantity)}
        />
        {item.condition && (
          <MetaField
            icon={<Package className="w-4 h-4" />}
            label="Condition"
            value={item.condition}
          />
        )}
        {item.value != null && (
          <MetaField
            icon={<DollarSign className="w-4 h-4" />}
            label="Value"
            value={`$${item.value.toFixed(2)}`}
          />
        )}
        {item.purchaseDate && (
          <MetaField
            icon={<Calendar className="w-4 h-4" />}
            label="Purchased"
            value={new Date(item.purchaseDate).toLocaleDateString()}
          />
        )}
        {item.barcode && (
          <MetaField
            icon={<Barcode className="w-4 h-4" />}
            label="Barcode"
            value={item.barcode}
            mono
          />
        )}
        {item.location && (
          <MetaField
            icon={<MapPin className="w-4 h-4" />}
            label="Location"
            value={item.location}
          />
        )}
      </div>

      {/* Tags */}
      {item.tags.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2.5">
            <p className="text-sm font-medium text-muted-foreground">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <Badge key={t.tagId} variant="secondary" className="font-normal">
                  {t.tag.name}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Notes */}
      {item.notes && (
        <>
          <Separator />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">Notes</p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{item.notes}</p>
          </div>
        </>
      )}

      {/* Timestamps */}
      <p className="text-xs text-muted-foreground/60 text-center pt-4">
        Added {new Date(item.createdAt).toLocaleDateString()} · Updated{" "}
        {new Date(item.updatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}

function MetaField({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium truncate ${mono ? "font-mono" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
