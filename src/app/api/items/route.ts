import { type NextRequest, NextResponse } from "next/server";
import { triggerEnrichment } from "@/lib/actions";
import { authorizeApiRequest } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { normalizeApiImages } from "@/lib/item-images";
import { itemWithRelationsInclude } from "@/lib/items";
import { buildSearchWhere } from "@/lib/search";
import { resolveTagConnections } from "@/lib/tags";

// GET /api/items — list all items, optionally filtered by ?q=
export async function GET(request: NextRequest) {
  const authorization = await authorizeApiRequest("read");
  if (authorization instanceof NextResponse) {
    return authorization;
  }

  const q = request.nextUrl.searchParams.get("q");

  const items = q
    ? await prisma.item.findMany({
        where: buildSearchWhere(q),
        include: itemWithRelationsInclude,
        orderBy: { updatedAt: "desc" },
      })
    : await prisma.item.findMany({
        include: itemWithRelationsInclude,
        orderBy: { updatedAt: "desc" },
      });

  return NextResponse.json(items);
}

// POST /api/items — create a new item
export async function POST(request: NextRequest) {
  const authorization = await authorizeApiRequest("create");
  if (authorization instanceof NextResponse) {
    return authorization;
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
    images,
    tags: tagNames,
  } = body;

  if (!name || typeof name !== "string" || !String(name).trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const normalizedImages = await normalizeApiImages(images);
    const item = await prisma.item.create({
      data: {
        name: String(name).trim(),
        description: (description as string) ?? null,
        category: (category as string) ?? null,
        quantity: typeof quantity === "number" ? quantity : 1,
        purchaseDate: purchaseDate ? new Date(purchaseDate as string) : null,
        value: value != null ? Number.parseFloat(String(value)) : null,
        condition: (condition as string) ?? null,
        barcode: (barcode as string) ?? null,
        location: (location as string) ?? null,
        notes: (notes as string) ?? null,
        userId: authorization.id,
        photo: normalizedImages.photo ?? null,
        enrichStatus: barcode || name ? "pending" : "none",
        images: {
          create: normalizedImages.images,
        },
        tags: {
          create: await resolveTagConnections(tagNames as string[]),
        },
      },
      include: itemWithRelationsInclude,
    });

    triggerEnrichment(item.id).catch(console.error);

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("Failed to create item:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
