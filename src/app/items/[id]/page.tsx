import {
  ArrowLeft,
  Calendar,
  DollarSign,
  ExternalLink,
  Layers,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarcodeDisplay } from "@/components/barcode-display";
import { ItemGallery } from "@/components/item-gallery";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { deleteItem } from "@/lib/actions";
import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { formatCurrency, itemWithRelationsInclude } from "@/lib/items";
import { canPerform } from "@/lib/permissions";
import { DeleteButton } from "./delete-button";

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: itemWithRelationsInclude,
  });

  if (!item) notFound();

  const deleteWithId = deleteItem.bind(null, item.id);
  const canEdit = canPerform(user.role, "update", item.userId ?? undefined, user.id);
  const canDelete = canPerform(user.role, "delete", item.userId ?? undefined, user.id);

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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{item.name}</h1>
          {item.category && <p className="text-sm text-muted-foreground">{item.category}</p>}
        </div>
        {(canEdit || canDelete) && (
          <div className="flex gap-2 shrink-0">
            {canEdit && (
              <Button
                render={<Link href={`/items/${item.id}/edit`} />}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
            )}
            {canDelete && <DeleteButton deleteAction={deleteWithId} />}
          </div>
        )}
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

      <ItemGallery itemName={item.name} images={item.images} fallbackPhoto={item.photo} />

      {/* Description */}
      {item.description && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">Description</p>
          <Markdown>{item.description}</Markdown>
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
            value={formatCurrency(item.value)}
          />
        )}
        {item.purchaseDate && (
          <MetaField
            icon={<Calendar className="w-4 h-4" />}
            label="Purchased"
            value={new Date(item.purchaseDate).toLocaleDateString()}
          />
        )}
        {item.location && (
          <MetaField icon={<MapPin className="w-4 h-4" />} label="Location" value={item.location} />
        )}
        {item.marketPrice != null && (
          <MetaField
            icon={<TrendingUp className="w-4 h-4" />}
            label="Market Price"
            value={formatCurrency(item.marketPrice)}
          />
        )}
      </div>

      {/* Market price source */}
      {item.priceSource && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Price via {item.priceSource}
            {item.priceSource === "HLJ.com" && " (approx. JPY→USD)"}
          </span>
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              View source <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Barcode */}
      {item.barcode && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Barcode</p>
            <div className="flex justify-center rounded-xl bg-muted/40 p-4">
              <BarcodeDisplay value={item.barcode} />
            </div>
          </div>
        </>
      )}

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
            <Markdown>{item.notes}</Markdown>
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
        <p className={`text-sm font-medium truncate ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
