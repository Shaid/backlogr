import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ItemWithTags } from "@/types";

export function ItemCard({ item }: { item: ItemWithTags }) {
  return (
    <Link href={`/items/${item.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
        {item.photo && (
          <div className="aspect-square w-full overflow-hidden rounded-t-lg">
            <img
              src={item.photo}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardHeader className="pb-2">
          <CardTitle className="text-base line-clamp-1">{item.name}</CardTitle>
          {item.category && (
            <p className="text-sm text-muted-foreground">{item.category}</p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {item.description}
            </p>
          )}
          <div className="flex flex-wrap gap-1">
            {item.tags.map((t) => (
              <Badge key={t.tagId} variant="secondary" className="text-xs">
                {t.tag.name}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            {item.location && <span>📍 {item.location}</span>}
            {item.value != null && (
              <span>${item.value.toFixed(2)}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
