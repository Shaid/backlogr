import { type NextRequest, NextResponse } from "next/server";
import { triggerEnrichment } from "@/lib/actions";
import { authorizeItemRequest } from "@/lib/authz";
import { prisma } from "@/lib/db";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await authorizeItemRequest(id, "update");
  if (authResult.authorization) return authResult.authorization;

  await prisma.item.update({
    where: { id },
    data: { enrichStatus: "pending" },
  });

  triggerEnrichment(id).catch(console.error);

  return NextResponse.json({ success: true, status: "pending" });
}
