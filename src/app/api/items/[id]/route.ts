import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import path from "path";
import fs from "fs/promises";

// GET /api/items/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
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

    // Remove existing tag associations and recreate
    await prisma.tagOnItem.deleteMany({ where: { itemId: id } });

    const item = await prisma.item.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(quantity !== undefined && { quantity }),
        ...(purchaseDate !== undefined && {
          purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        }),
        ...(value !== undefined && {
          value: value != null ? parseFloat(value) : null,
        }),
        ...(condition !== undefined && { condition }),
        ...(barcode !== undefined && { barcode }),
        ...(location !== undefined && { location }),
        ...(notes !== undefined && { notes }),
        ...(photo !== undefined && { photo }),
        tags: {
          create: await resolveTagConnections(tagNames),
        },
      },
      include: { tags: { include: { tag: true } } },
    });

    return NextResponse.json(item);
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// DELETE /api/items/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Clean up photo file
  if (item.photo) {
    const filePath = path.join(process.cwd(), "public", item.photo);
    await fs.unlink(filePath).catch(() => {});
  }

  await prisma.item.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

async function resolveTagConnections(
  tagNames?: string[]
): Promise<{ tagId: string }[]> {
  if (!tagNames || !Array.isArray(tagNames)) return [];
  return Promise.all(
    tagNames
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter(Boolean)
      .map(async (name) => {
        const tag = await prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        return { tagId: tag.id };
      })
  );
}
