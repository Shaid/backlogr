import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeDeletePhoto } from "@/lib/files";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  const { id, imageId } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: { images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
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

  const remainingImages = item.images.filter((entry) => entry.id !== imageId);
  const nextHero = remainingImages.find((entry) => entry.isHero) ?? remainingImages[0] ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.itemImage.delete({ where: { id: image.id } });

    await Promise.all(
      remainingImages.map((entry, index) =>
        tx.itemImage.update({
          where: { id: entry.id },
          data: {
            sortOrder: index,
            isHero: nextHero ? entry.id === nextHero.id : false,
          },
        }),
      ),
    );

    await tx.item.update({
      where: { id: item.id },
      data: {
        photo: nextHero?.url ?? null,
      },
    });
  });

  const keptUrls = new Set(remainingImages.map((entry) => entry.url));
  if (!keptUrls.has(image.url)) {
    await safeDeletePhoto(image.url);
  }

  return NextResponse.json({
    success: true,
    photo: nextHero?.url ?? null,
    images: remainingImages.map((entry, index) => ({
      ...entry,
      isHero: nextHero ? entry.id === nextHero.id : false,
      sortOrder: index,
    })),
  });
}
