import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { safeDeletePhoto } from "@/lib/files";
import { resolveTagConnections } from "@/lib/tags";

// GET /api/items/:id
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } } },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

// PUT /api/items/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

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
    tags: tagNames,
  } = body;

  // Normalize empty string photo to null
  const normalizedPhoto = photo === "" ? null : photo;

  try {
    // Wrap tag delete + recreate in a transaction for atomicity
    const item = await prisma.$transaction(async (tx) => {
      await tx.tagOnItem.deleteMany({ where: { itemId: id } });
      const tagConnections = await resolveTagConnections(tagNames as string[], tx);

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
          ...(normalizedPhoto !== undefined && { photo: normalizedPhoto as string | null }),
          tags: { create: tagConnections },
        },
        include: { tags: { include: { tag: true } } },
      });
    });

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
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (item.photo) {
    await safeDeletePhoto(item.photo);
  }

  await prisma.item.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
