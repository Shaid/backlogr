import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { itemWithRelationsInclude } from "@/lib/items";

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  const { id, imageId } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: { images: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  const authorization = await authorizeApiRequest("update", item.userId);
  if (authorization instanceof NextResponse) {
    return authorization;
  }

  const image = item.images.find((entry) => entry.id === imageId);
  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const updatedItem = await prisma.$transaction(async (tx) => {
    await tx.itemImage.updateMany({
      where: { itemId: item.id },
      data: { isHero: false },
    });

    await tx.itemImage.update({
      where: { id: image.id },
      data: { isHero: true },
    });

    await tx.item.update({
      where: { id: item.id },
      data: { photo: image.url },
    });

    return tx.item.findUnique({
      where: { id: item.id },
      include: itemWithRelationsInclude,
    });
  });

  if (!updatedItem) {
    return NextResponse.json({ error: "Item no longer exists" }, { status: 404 });
  }

  return NextResponse.json(updatedItem);
}
