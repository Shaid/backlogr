import { type NextRequest, NextResponse } from "next/server";
import { triggerEnrichment } from "@/lib/actions";
import { prisma } from "@/lib/db";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Reset status to pending and trigger
  await prisma.item.update({
    where: { id },
    data: { enrichStatus: "pending" },
  });

  triggerEnrichment(id);

  return NextResponse.json({ success: true, status: "pending" });
}
