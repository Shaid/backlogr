import type { Prisma } from "@/generated/prisma/client";

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
