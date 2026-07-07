import type { Prisma } from "@/generated/prisma/client";

export const LEGACY_IMAGE_TOKEN = "legacy:photo";

export const orderedItemImages = {
  orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
} satisfies Prisma.Item$imagesArgs;

export const itemWithRelationsInclude = {
  tags: { include: { tag: true } },
  images: orderedItemImages,
} satisfies Prisma.ItemInclude;

type ItemImageLike = {
  url: string;
  isHero: boolean;
  sortOrder: number;
  createdAt?: Date;
};

type ItemWithImagesLike = {
  photo: string | null;
  images?: ItemImageLike[];
};

export function getItemDisplayImage(item: ItemWithImagesLike): string | null {
  const images = [...(item.images ?? [])].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    if (a.createdAt && b.createdAt) {
      return a.createdAt.getTime() - b.createdAt.getTime();
    }

    return 0;
  });

  const heroImage = images.find((image) => image.isHero);
  return heroImage?.url ?? images[0]?.url ?? item.photo;
}

/** Collect all image URLs (photo + images relation) into a Set for bulk operations. */
export function collectItemImageUrls(item: {
  photo: string | null;
  images: { url: string }[];
}): Set<string> {
  const urls = new Set<string>();
  if (item.photo) {
    urls.add(item.photo);
  }
  for (const image of item.images) {
    urls.add(image.url);
  }
  return urls;
}

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCurrency(value: number): string {
  return CURRENCY_FORMATTER.format(value);
}
