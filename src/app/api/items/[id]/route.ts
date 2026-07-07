import { type NextRequest, NextResponse } from "next/server";
import { authorizeItemRequest } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeDeletePhoto } from "@/lib/files";
import { normalizeApiImages } from "@/lib/item-images";
import { collectItemImageUrls } from "@/lib/items";
import { resolveTagConnections } from "@/lib/tags";

// GET /api/items/:id
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await authorizeItemRequest(id, "read");
  if (result.authorization) return result.authorization;

  return NextResponse.json(result.item);
}

// PUT /api/items/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await authorizeItemRequest(id, "update");
  if (authResult.authorization) return authResult.authorization;
  const existing = authResult.item!;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    name,
    description,
    category,
    quantity,
    purchaseDate,
    value,
    condition,
    barcode,
    location,
    notes,
    photo,
    images,
    tags: tagNames,
  } = body;

  const normalizedPhoto = photo === "" ? null : photo;

  try {
    const normalizedImages = await normalizeApiImages(images);
    const deletedImageUrls: string[] = [];

    const item = await prisma.$transaction(async (tx) => {
      await tx.tagOnItem.deleteMany({ where: { itemId: id } });
      const tagConnections = await resolveTagConnections(tagNames as string[], tx);

      if (Array.isArray(images)) {
        const currentImageUrls = existing.images.map((image) => image.url);
        const nextImageUrls = normalizedImages.images.map((image) => image.url);

        deletedImageUrls.push(
          ...currentImageUrls.filter(
            (imageUrl) =>
              !nextImageUrls.includes(imageUrl) &&
              imageUrl !== normalizedImages.photo &&
              imageUrl !== normalizedPhoto,
          ),
        );
        if (
          existing.photo &&
          existing.images.length === 0 &&
          existing.photo !== normalizedImages.photo &&
          existing.photo !== normalizedPhoto
        ) {
          deletedImageUrls.push(existing.photo);
        }

        await tx.itemImage.deleteMany({ where: { itemId: id } });
      }

      return tx.item.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: String(name) }),
          ...(description !== undefined && { description: description as string | null }),
          ...(category !== undefined && { category: category as string | null }),
          ...(quantity !== undefined && { quantity: Number(quantity) }),
          ...(purchaseDate !== undefined && {
            purchaseDate: purchaseDate ? new Date(purchaseDate as string) : null,
          }),
          ...(value !== undefined && {
            value: value != null ? Number.parseFloat(String(value)) : null,
          }),
          ...(condition !== undefined && { condition: condition as string | null }),
          ...(barcode !== undefined && { barcode: barcode as string | null }),
          ...(location !== undefined && { location: location as string | null }),
          ...(notes !== undefined && { notes: notes as string | null }),
          ...(normalizedPhoto !== undefined || Array.isArray(images)
            ? { photo: normalizedImages.photo ?? null }
            : {}),
          ...(Array.isArray(images)
            ? {
                images: {
                  create: normalizedImages.images,
                },
              }
            : {}),
          tags: { create: tagConnections },
        },
        include: {
          tags: { include: { tag: true } },
          images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        },
      });
    });

    await Promise.all([...new Set(deletedImageUrls)].map((imageUrl) => safeDeletePhoto(imageUrl)));

    return NextResponse.json(item);
  } catch (err) {
    console.error("Failed to update item:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/items/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authResult = await authorizeItemRequest(id, "delete");
  if (authResult.authorization) return authResult.authorization;
  const item = authResult.item!;

  const imageUrls = collectItemImageUrls(item);

  await prisma.item.delete({ where: { id } });
  await Promise.all([...imageUrls].map((imageUrl) => safeDeletePhoto(imageUrl)));
  return NextResponse.json({ success: true });
}
