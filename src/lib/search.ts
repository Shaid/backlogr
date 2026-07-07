import type { Prisma } from "@/generated/prisma/client";

export function buildSearchWhere(query: string): Prisma.ItemWhereInput {
  return {
    OR: [
      { name: { contains: query } },
      { description: { contains: query } },
      { category: { contains: query } },
      { barcode: { contains: query } },
      { location: { contains: query } },
      {
        tags: {
          some: {
            tag: { name: { contains: query } },
          },
        },
      },
    ],
  };
}
