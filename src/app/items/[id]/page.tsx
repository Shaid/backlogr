import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { deleteItem } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{item.name}</h1>
        <div className="flex gap-2">
          <Link href={`/items/${item.id}/edit`}>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </Link>
          <DeleteButton deleteAction={deleteWithId} />
        </div>
      </div>

      {item.enrichStatus === "pending" && (
        <div className="text-sm text-muted-foreground bg-muted rounded-md px-3 py-2">
          ⏳ Looking up product details...
        </div>
      )}
      {item.enrichStatus === "complete" && (
        <div className="text-sm text-green-500 bg-green-500/10 rounded-md px-3 py-2">
          ✅ Product details enriched automatically
        </div>
      )}

      {item.photo && (
        <div className="rounded-lg overflow-hidden">
          <img
            src={item.photo}
            alt={item.name}
            className="w-full max-h-96 object-contain bg-muted"
          />
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          {item.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Description
              </p>
              <p>{item.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {item.category && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Category
                </p>
                <p>{item.category}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Quantity
              </p>
              <p>{item.quantity}</p>
            </div>
            {item.condition && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Condition
                </p>
                <p>{item.condition}</p>
              </div>
            )}
            {item.value != null && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Value
                </p>
                <p>${item.value.toFixed(2)}</p>
              </div>
            )}
            {item.purchaseDate && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Purchase Date
                </p>
                <p>{new Date(item.purchaseDate).toLocaleDateString()}</p>
              </div>
            )}
            {item.barcode && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Barcode
                </p>
                <p className="font-mono">{item.barcode}</p>
              </div>
            )}
            {item.location && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Location
                </p>
                <p>📍 {item.location}</p>
              </div>
            )}
          </div>

          {item.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((t) => (
                    <Badge key={t.tagId} variant="secondary">
                      {t.tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {item.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Notes
                </p>
                <p className="whitespace-pre-wrap">{item.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Added {new Date(item.createdAt).toLocaleDateString()} · Updated{" "}
        {new Date(item.updatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}
