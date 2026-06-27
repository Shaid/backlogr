import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { triggerEnrichment } from "@/lib/actions";

// GET /api/items — list all items, optionally filtered by ?q=
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");

  const items = q
    ? await prisma.item.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
            { category: { contains: q } },
            { barcode: { contains: q } },
            { location: { contains: q } },
            {
              tags: {
                some: { tag: { name: { contains: q } } },
              },
            },
          ],
        },
        include: { tags: { include: { tag: true } } },
        orderBy: { updatedAt: "desc" },
      })
    : await prisma.item.findMany({
        include: { tags: { include: { tag: true } } },
        orderBy: { updatedAt: "desc" },
      });

  return NextResponse.json(items);
}

// POST /api/items — create a new item
export async function POST(request: NextRequest) {
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

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const item = await prisma.item.create({
      data: {
        name,
        description: description ?? null,
        category: category ?? null,
        quantity: quantity ?? 1,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        value: value != null ? parseFloat(value) : null,
        condition: condition ?? null,
        barcode: barcode ?? null,
        location: location ?? null,
        notes: notes ?? null,
        photo: photo ?? null,
        enrichStatus: barcode || name ? "pending" : "none",
        tags: {
          create: await resolveTagConnections(tagNames),
        },
      },
      include: { tags: { include: { tag: true } } },
    });

    // Trigger enrichment in background
    triggerEnrichment(item.id).catch(console.error);

    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
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
