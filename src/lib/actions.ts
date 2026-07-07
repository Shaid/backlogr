"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireCurrentUser, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { enrichItem } from "@/lib/enrichment";
import { safeDeletePhoto, saveUploadedImages } from "@/lib/files";
import { parseItemFormData } from "@/lib/form-data";
import {
  buildCreateImagePayload,
  getImageFilesFromFormData,
  syncItemImagesFromFormData,
} from "@/lib/item-images";
import { collectItemImageUrls, itemWithRelationsInclude } from "@/lib/items";
import type { Role } from "@/lib/permissions";
import { resolveTagConnections } from "@/lib/tags";

const VALID_ROLES = new Set<Role>(["admin", "editor", "viewer", "owner"]);

export async function createItem(formData: FormData) {
  const user = await requirePermission("create");
  const data = parseItemFormData(formData);
  const imagePayload = await buildCreateImagePayload(formData);

  const tagNames = data.tagsStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const item = await (async () => {
    try {
      return await prisma.item.create({
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          quantity: data.quantity,
          purchaseDate: data.purchaseDate,
          value: data.value,
          condition: data.condition,
          barcode: data.barcode,
          location: data.location,
          notes: data.notes,
          userId: user.id,
          photo: imagePayload.photo,
          enrichStatus: data.barcode || data.name ? "pending" : "none",
          images: {
            create: imagePayload.images,
          },
          tags: {
            create: await resolveTagConnections(tagNames),
          },
        },
      });
    } catch (error) {
      await Promise.all(imagePayload.images.map((image) => safeDeletePhoto(image.url)));
      throw error;
    }
  })();

  enrichItem(item.id).catch(console.error);

  revalidatePath("/");
  redirect(`/items/${item.id}`);
}

export async function updateItem(id: string, formData: FormData) {
  const existingItem = await prisma.item.findUnique({
    where: { id },
    include: { images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });
  if (!existingItem) {
    throw new Error("Item not found");
  }
  await requirePermission("update", existingItem.userId);

  const data = parseItemFormData(formData);
  const uploadedImageUrls = await saveUploadedImages(getImageFilesFromFormData(formData));

  let deletedImageUrls: string[] = [];
  try {
    deletedImageUrls = await prisma.$transaction(async (tx) => {
      await tx.tagOnItem.deleteMany({ where: { itemId: id } });

      const tagConnections = await resolveTagConnections(
        data.tagsStr
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        tx,
      );

      const imageResult = await syncItemImagesFromFormData(
        tx,
        existingItem,
        formData,
        uploadedImageUrls,
      );

      await tx.item.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          quantity: data.quantity,
          purchaseDate: data.purchaseDate,
          value: data.value,
          condition: data.condition,
          barcode: data.barcode,
          location: data.location,
          notes: data.notes,
          photo: imageResult.photo,
          tags: {
            create: tagConnections,
          },
        },
      });
      return imageResult.deletedUrls;
    });
  } catch (error) {
    await Promise.all(uploadedImageUrls.map((imageUrl) => safeDeletePhoto(imageUrl)));
    throw error;
  }

  await Promise.all(deletedImageUrls.map((imageUrl) => safeDeletePhoto(imageUrl)));

  revalidatePath("/");
  revalidatePath(`/items/${id}`);
  redirect(`/items/${id}`);
}

export async function deleteItem(id: string) {
  const item = await prisma.item.findUnique({
    where: { id },
    include: { images: true },
  });
  if (!item) {
    throw new Error("Item not found");
  }
  await requirePermission("delete", item.userId);

  const imageUrls = collectItemImageUrls(item);

  await prisma.item.delete({ where: { id } });
  await Promise.all([...imageUrls].map((imageUrl) => safeDeletePhoto(imageUrl)));
  revalidatePath("/");
  redirect("/");
}

export async function searchItems(query: string) {
  await requireCurrentUser();

  return prisma.item.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { description: { contains: query } },
        { category: { contains: query } },
        { barcode: { contains: query } },
        { location: { contains: query } },
        {
          tags: {
            some: {
              tag: { name: { contains: query } },
            },
          },
        },
      ],
    },
    include: itemWithRelationsInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function triggerEnrichment(itemId: string) {
  return enrichItem(itemId);
}

export async function updateUserRole(userId: string, formData: FormData) {
  await requireAdmin();

  const role = formData.get("role");
  if (typeof role !== "string" || !VALID_ROLES.has(role as Role)) {
    throw new Error("Invalid role");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath("/admin");
}
