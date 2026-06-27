"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import path from "path";
import fs from "fs/promises";

export async function createItem(formData: FormData) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const category = (formData.get("category") as string) || null;
  const quantity = parseInt(formData.get("quantity") as string) || 1;
  const purchaseDateStr = formData.get("purchaseDate") as string;
  const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : null;
  const valueStr = formData.get("value") as string;
  const value = valueStr ? parseFloat(valueStr) : null;
  const condition = (formData.get("condition") as string) || null;
  const barcode = (formData.get("barcode") as string) || null;
  const location = (formData.get("location") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const tagsStr = (formData.get("tags") as string) || "";

  // Handle photo upload
  let photoPath: string | null = null;
  const photo = formData.get("photo") as File;
  if (photo && photo.size > 0) {
    photoPath = await savePhoto(photo);
  }

  // Parse tags
  const tagNames = tagsStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const item = await prisma.item.create({
    data: {
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
      photo: photoPath,
      enrichStatus: barcode || name ? "pending" : "none",
      tags: {
        create: await Promise.all(
          tagNames.map(async (tagName) => {
            const tag = await prisma.tag.upsert({
              where: { name: tagName },
              update: {},
              create: { name: tagName },
            });
            return { tagId: tag.id };
          })
        ),
      },
    },
  });

  // Trigger enrichment in background (fire and forget)
  enrichItem(item.id).catch(console.error);

  revalidatePath("/");
  redirect(`/items/${item.id}`);
}

export async function updateItem(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const category = (formData.get("category") as string) || null;
  const quantity = parseInt(formData.get("quantity") as string) || 1;
  const purchaseDateStr = formData.get("purchaseDate") as string;
  const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : null;
  const valueStr = formData.get("value") as string;
  const value = valueStr ? parseFloat(valueStr) : null;
  const condition = (formData.get("condition") as string) || null;
  const barcode = (formData.get("barcode") as string) || null;
  const location = (formData.get("location") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const tagsStr = (formData.get("tags") as string) || "";

  // Handle photo upload
  let photoPath: string | null | undefined = undefined;
  const photo = formData.get("photo") as File;
  if (photo && photo.size > 0) {
    photoPath = await savePhoto(photo);
  }
  const removePhoto = formData.get("removePhoto") === "true";
  if (removePhoto) {
    photoPath = null;
  }

  const tagNames = tagsStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // Remove existing tag associations
  await prisma.tagOnItem.deleteMany({ where: { itemId: id } });

  await prisma.item.update({
    where: { id },
    data: {
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
      ...(photoPath !== undefined ? { photo: photoPath } : {}),
      tags: {
        create: await Promise.all(
          tagNames.map(async (tagName) => {
            const tag = await prisma.tag.upsert({
              where: { name: tagName },
              update: {},
              create: { name: tagName },
            });
            return { tagId: tag.id };
          })
        ),
      },
    },
  });

  revalidatePath("/");
  revalidatePath(`/items/${id}`);
  redirect(`/items/${id}`);
}

export async function deleteItem(id: string) {
  // Delete photo file if exists
  const item = await prisma.item.findUnique({ where: { id } });
  if (item?.photo) {
    const filePath = path.join(process.cwd(), "public", item.photo);
    await fs.unlink(filePath).catch(() => {});
  }

  await prisma.item.delete({ where: { id } });
  revalidatePath("/");
  redirect("/");
}

export async function searchItems(query: string) {
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
    include: { tags: { include: { tag: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

async function savePhoto(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const ext = path.extname(file.name) || ".jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filePath = path.join(uploadDir, filename);

  await fs.writeFile(filePath, buffer);
  return `/uploads/${filename}`;
}

async function enrichItem(itemId: string) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return;

  try {
    let enrichedData: {
      description?: string;
      photo?: string;
      category?: string;
    } = {};

    // Try barcode lookup first via Open Food Facts (works for many UPC/EAN codes)
    if (item.barcode) {
      try {
        const res = await fetch(
          `https://world.openfoodfacts.org/api/v0/product/${item.barcode}.json`
        );
        const data = await res.json();
        if (data.status === 1 && data.product) {
          const product = data.product;
          if (!item.description && product.product_name) {
            enrichedData.description = product.product_name;
          }
          if (!item.category && product.categories) {
            enrichedData.category = product.categories.split(",")[0]?.trim();
          }
          if (!item.photo && product.image_url) {
            const photoPath = await downloadImage(product.image_url);
            if (photoPath) enrichedData.photo = photoPath;
          }
        }
      } catch {
        // Open Food Facts didn't have it, continue
      }

      // Try Open Library for ISBN barcodes
      if (
        Object.keys(enrichedData).length === 0 &&
        (item.barcode.length === 10 || item.barcode.length === 13)
      ) {
        try {
          const res = await fetch(
            `https://openlibrary.org/api/books?bibkeys=ISBN:${item.barcode}&format=json&jscmd=data`
          );
          const data = await res.json();
          const book = data[`ISBN:${item.barcode}`];
          if (book) {
            if (!item.description && book.title) {
              enrichedData.description = book.title;
            }
            if (!item.category) {
              enrichedData.category = "Books";
            }
            if (!item.photo && book.cover?.large) {
              const photoPath = await downloadImage(book.cover.large);
              if (photoPath) enrichedData.photo = photoPath;
            }
          }
        } catch {
          // Open Library didn't have it either
        }
      }
    }

    await prisma.item.update({
      where: { id: itemId },
      data: {
        ...enrichedData,
        enrichStatus:
          Object.keys(enrichedData).length > 0 ? "complete" : "failed",
      },
    });
  } catch {
    await prisma.item.update({
      where: { id: itemId },
      data: { enrichStatus: "failed" },
    });
  }
}

async function downloadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const ext =
      path.extname(new URL(url).pathname).split("?")[0] || ".jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = path.join(uploadDir, filename);

    await fs.writeFile(filePath, buffer);
    return `/uploads/${filename}`;
  } catch {
    return null;
  }
}
