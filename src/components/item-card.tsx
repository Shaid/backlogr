import { MapPin, Package } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, getItemDisplayImage } from "@/lib/items";
import type { ItemWithTags } from "@/types";

export function ItemCard({ item }: { item: ItemWithTags }) {
  const displayImage = getItemDisplayImage(item);

  return (
    <Link href={`/items/${item.id}`} className="group">
      <Card className="overflow-hidden h-full transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-0.5">
        <div className="aspect-[4/3] w-full overflow-hidden bg-muted/50">
          {displayImage ? (
            <img
              src={displayImage}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-10 h-10 text-muted-foreground/30" />
            </div>
          )}
        </div>
        <CardContent className="p-4 space-y-2.5">
          <div>
            <h3 className="font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {item.name}
            </h3>
            {item.category && (
              <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
            )}
          </div>

          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {item.description.replace(/[#*`[\]_~>]+/g, "").replace(/\n/g, " ")}
            </p>
          )}

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((t) => (
                <Badge
                  key={t.tagId}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-5 font-normal"
                >
                  {t.tag.name}
                </Badge>
              ))}
              {item.tags.length > 3 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                  +{item.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
            {item.location ? (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {item.location}
              </span>
            ) : (
              <span />
            )}
            {item.value != null && (
              <span className="font-medium text-foreground">{formatCurrency(item.value)}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
