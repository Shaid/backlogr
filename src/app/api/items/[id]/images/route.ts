import { NextResponse } from "next/server";
import { authorizeItemRequest } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeDeletePhoto, saveUploadedImages } from "@/lib/files";
import { getImageFilesFromFormData } from "@/lib/item-images";
import { itemWithRelationsInclude } from "@/lib/items";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await authorizeItemRequest(id, "update");
  if (authResult.authorization) return authResult.authorization;
  const item = authResult.item!;

  const formData = await request.formData();
  const files = getImageFilesFromFormData(formData);

  if (files.length === 0) {
    return NextResponse.json({ error: "At least one image is required" }, { status: 400 });
  }

  let uploadedUrls: string[] = [];

  try {
    uploadedUrls = await saveUploadedImages(files);

    const updatedItem = await prisma.$transaction(async (tx) => {
      let currentImages = item.images;
      if (currentImages.length === 0 && item.photo) {
        const legacyImage = await tx.itemImage.create({
          data: {
            itemId: item.id,
            url: item.photo,
            isHero: true,
            sortOrder: 0,
          },
        });
        currentImages = [legacyImage];
      }

      const startSortOrder =
        currentImages.length > 0
          ? Math.max(...currentImages.map((image) => image.sortOrder)) + 1
          : 0;
      const hasHeroImage = currentImages.some((image) => image.isHero);

      await Promise.all(
        uploadedUrls.map((url, index) =>
          tx.itemImage.create({
            data: {
              itemId: item.id,
              url,
              sortOrder: startSortOrder + index,
              isHero: !hasHeroImage && index === 0 && currentImages.length === 0,
            },
          }),
        ),
      );

      if (!item.photo && currentImages.length === 0) {
        await tx.item.update({
          where: { id: item.id },
          data: {
            photo: uploadedUrls[0] ?? null,
          },
        });
      }

      return tx.item.findUnique({
        where: { id: item.id },
        include: itemWithRelationsInclude,
      });
    });

    if (!updatedItem) {
      await Promise.all(uploadedUrls.map((imageUrl) => safeDeletePhoto(imageUrl)));
      return NextResponse.json({ error: "Item no longer exists" }, { status: 404 });
    }

    return NextResponse.json(updatedItem, { status: 201 });
  } catch (error) {
    console.error("Failed to upload item images:", error);
    await Promise.all(uploadedUrls.map((imageUrl) => safeDeletePhoto(imageUrl)));
    return NextResponse.json({ error: "Failed to upload images" }, { status: 500 });
  }
}
