"use client";

import { Package } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type GalleryImage = {
  id: string;
  url: string;
  isHero: boolean;
  sortOrder: number;
};

type ItemGalleryProps = {
  itemName: string;
  images?: GalleryImage[];
  fallbackPhoto?: string | null;
};

export function ItemGallery({ itemName, images = [], fallbackPhoto }: ItemGalleryProps) {
  const normalizedImages = useMemo(() => {
    if (images.length > 0) {
      return [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    }

    if (fallbackPhoto) {
      return [
        {
          id: "legacy-photo",
          url: fallbackPhoto,
          isHero: true,
          sortOrder: 0,
        },
      ];
    }

    return [];
  }, [fallbackPhoto, images]);

  const defaultHero =
    normalizedImages.find((image) => image.isHero)?.id ?? normalizedImages[0]?.id ?? null;
  const [activeImageId, setActiveImageId] = useState(defaultHero);

  useEffect(() => {
    setActiveImageId(defaultHero);
  }, [defaultHero]);

  const activeImage =
    normalizedImages.find((image) => image.id === activeImageId) ??
    normalizedImages.find((image) => image.isHero) ??
    normalizedImages[0] ??
    null;

  if (!activeImage) {
    return (
      <div className="rounded-2xl border border-border bg-muted/30 flex items-center justify-center h-48">
        <Package className="w-12 h-12 text-muted-foreground/20" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border bg-muted/30">
        <img src={activeImage.url} alt={itemName} className="w-full max-h-[28rem] object-contain" />
      </div>
      {normalizedImages.length > 1 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {normalizedImages.map((image) => {
            const isActive = image.id === activeImage.id;

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveImageId(image.id)}
                className={`overflow-hidden rounded-xl border transition-all ${
                  isActive
                    ? "border-primary shadow-[0_0_0_1px] shadow-primary/30"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <img
                  src={image.url}
                  alt={`${itemName} thumbnail`}
                  className="aspect-square w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
