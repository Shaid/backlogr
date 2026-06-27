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

// Exported wrapper for triggering enrichment from API routes
export async function triggerEnrichment(itemId: string) {
  return enrichItem(itemId);
}

async function enrichItem(itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { tags: { include: { tag: true } } },
  });
  if (!item) return;

  try {
    let enrichedData: {
      description?: string;
      photo?: string;
      category?: string;
      marketPrice?: number;
      priceSource?: string;
      sourceUrl?: string;
    } = {};

    const isModelKit = looksLikeModelKit(item);

    // 1. HLJ scraper for model kits
    if (isModelKit) {
      const hljData = await scrapeHLJ(item.name, item.barcode);
      if (hljData) {
        if (!item.description && hljData.description) {
          enrichedData.description = hljData.description;
        }
        if (!item.category && hljData.category) {
          enrichedData.category = hljData.category;
        }
        if (!item.photo && hljData.imageUrl) {
          const photoPath = await downloadImage(hljData.imageUrl);
          if (photoPath) enrichedData.photo = photoPath;
        }
        if (hljData.price) {
          enrichedData.marketPrice = hljData.price;
          enrichedData.priceSource = "HLJ.com";
        }
        if (hljData.url) {
          enrichedData.sourceUrl = hljData.url;
        }
      }
    }

    // 2. Open Food Facts (for barcoded consumer goods)
    if (item.barcode && !enrichedData.description && !isModelKit) {
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
        // continue
      }
    }

    // 3. Open Library for ISBN barcodes
    if (
      item.barcode &&
      !enrichedData.description &&
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
        // continue
      }
    }

    // 4. eBay price lookup (for all items)
    if (!enrichedData.marketPrice) {
      const ebayPrice = await searchEbayPrice(item.name, item.barcode);
      if (ebayPrice) {
        enrichedData.marketPrice = ebayPrice.price;
        enrichedData.priceSource = ebayPrice.source;
        if (!enrichedData.sourceUrl) {
          enrichedData.sourceUrl = ebayPrice.url;
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

function looksLikeModelKit(item: {
  name: string;
  category: string | null;
  tags: { tag: { name: string } }[];
}): boolean {
  const text = `${item.name} ${item.category ?? ""}`.toLowerCase();
  const tagNames = item.tags.map((t) => t.tag.name.toLowerCase());
  const keywords = [
    "model kit",
    "gundam",
    "gunpla",
    "master grade",
    "perfect grade",
    "high grade",
    "real grade",
    "bandai",
    "kotobukiya",
    "hasegawa",
    "tamiya",
    "scale model",
    "1/100",
    "1/144",
    "1/60",
    "1/72",
    "mg ",
    "hg ",
    "rg ",
    "pg ",
  ];
  return keywords.some((kw) => text.includes(kw) || tagNames.some((t) => t.includes(kw.trim())));
}

// --- HLJ Scraper ---
// Strategy: Use DuckDuckGo HTML search to find HLJ product URL,
// then fetch the product page directly (HLJ WAF doesn't block product pages).
// Product pages embed rich dataLayer JSON with name, price, description, etc.

async function scrapeHLJ(
  name: string,
  barcode: string | null
): Promise<{
  description?: string;
  category?: string;
  imageUrl?: string;
  price?: number;
  url?: string;
} | null> {
  try {
    // Step 1: Find HLJ product URL via DuckDuckGo HTML search
    const query = barcode || name;
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:hlj.com ${query}`)}`;

    const searchRes = await fetch(ddgUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
        Accept: "text/html",
      },
    });
    if (!searchRes.ok) {
      console.log(`[enrichment] DuckDuckGo search returned ${searchRes.status}`);
      return null;
    }
    const searchHtml = await searchRes.text();

    // Extract HLJ product URLs from DuckDuckGo results
    // DDG encodes URLs as: uddg=https%3A%2F%2Fwww.hlj.com%2Fproduct-slug-SKUCODE
    const urlMatches = searchHtml.matchAll(
      /uddg=(https%3A%2F%2Fwww\.hlj\.com%2F[a-z0-9%\-]+)/gi
    );
    let productUrl: string | null = null;
    for (const match of urlMatches) {
      const decoded = decodeURIComponent(match[1]);
      // Filter out search/category pages — product URLs end with a SKU code
      if (
        !decoded.includes("/search") &&
        !decoded.includes("/browse") &&
        /[a-z]{2,6}\d{3,8}$/.test(decoded)
      ) {
        productUrl = decoded;
        break;
      }
    }

    if (!productUrl) {
      console.log(`[enrichment] No HLJ product URL found for "${name}"`);
      return null;
    }

    // Step 2: Fetch the product page directly (WAF doesn't block these)
    const productRes = await fetch(productUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
        Accept: "text/html",
      },
    });
    if (!productRes.ok) return null;
    const productHtml = await productRes.text();

    return parseHLJProductPage(productHtml, productUrl);
  } catch (err) {
    console.log(`[enrichment] HLJ scrape error: ${err}`);
    return null;
  }
}

function parseHLJProductPage(
  html: string,
  url: string
): {
  description?: string;
  category?: string;
  imageUrl?: string;
  price?: number;
  url: string;
} | null {
  try {
    // Extract product data from dataLayer script
    const dataLayerMatch = html.match(
      /window\.dataLayer\.push\(\{[\s\S]*?products:\s*\[\s*(\{[\s\S]*?\})\s*\]/
    );
    if (!dataLayerMatch) return null;

    // Parse the product JSON (it may have single quotes or HTML entities)
    let productJson = dataLayerMatch[1];
    productJson = productJson
      .replace(/\\'/g, "'")
      .replace(/'/g, '"')
      .replace(/,\s*}/g, "}");

    let product: Record<string, unknown>;
    try {
      product = JSON.parse(productJson);
    } catch {
      const nameMatch = productJson.match(/"name":\s*"([^"]+)"/);
      const priceMatch = productJson.match(/"price":\s*(\d+)/);
      const descMatch = productJson.match(/"meta_description":\s*"([^"]+)"/);
      const categoryMatch = productJson.match(/"category":\s*"([^"]+)"/);
      const skuMatch = productJson.match(/"sku":\s*"([^"]+)"/);

      product = {
        name: nameMatch?.[1],
        price: priceMatch ? parseInt(priceMatch[1]) : undefined,
        meta_description: descMatch?.[1],
        category: categoryMatch?.[1],
        sku: skuMatch?.[1],
      };
    }

    const sku = product.sku as string | undefined;
    const result: {
      description?: string;
      category?: string;
      imageUrl?: string;
      price?: number;
      url: string;
    } = { url };

    if (product.meta_description) {
      result.description = product.meta_description as string;
    }
    if (product.category) {
      result.category = product.category as string;
    }
    if (product.price && typeof product.price === "number") {
      result.price = Math.round((product.price / 150) * 100) / 100;
    }

    if (sku) {
      const lowerSku = sku.toLowerCase();
      result.imageUrl = `https://www.hlj.com/images/prm/${lowerSku}/${lowerSku}prm1.jpg`;
    }

    return result;
  } catch {
    return null;
  }
}

// --- Price Lookup ---
// Uses UPCitemdb (barcode → offers) and DuckDuckGo HTML search as fallback.
// eBay/Amazon block server-side scraping, so we use public APIs.

async function searchEbayPrice(
  name: string,
  barcode: string | null
): Promise<{ price: number; source: string; url: string } | null> {
  // 1. Try UPCitemdb.com (free barcode lookup with pricing)
  if (barcode) {
    try {
      const res = await fetch(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
        {
          headers: { Accept: "application/json" },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.items?.[0]?.offers) {
          const offers = data.items[0].offers as {
            price?: number;
            link?: string;
            merchant?: string;
          }[];
          const prices = offers
            .filter((o) => o.price && o.price > 0)
            .map((o) => o.price as number);
          if (prices.length > 0) {
            prices.sort((a, b) => a - b);
            const median = prices[Math.floor(prices.length / 2)];
            return {
              price: Math.round(median * 100) / 100,
              source: `UPCitemdb (median of ${prices.length} offer${prices.length !== 1 ? "s" : ""})`,
              url: `https://www.upcitemdb.com/upc/${barcode}`,
            };
          }
        }
      }
    } catch {
      // continue to next source
    }
  }

  // 2. Try DuckDuckGo HTML search for eBay Buy It Now prices
  try {
    const query = barcode || name;
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:ebay.com "${query}" buy it now`)}`;

    const res = await fetch(ddgUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
        Accept: "text/html",
      },
    });
    if (res.ok) {
      const html = await res.text();
      // Extract prices from result snippets (DDG shows prices in snippets)
      const prices: number[] = [];
      const priceMatches = html.matchAll(/\$([\d,]+\.\d{2})/g);
      for (const match of priceMatches) {
        const price = parseFloat(match[1].replace(/,/g, ""));
        if (price > 1 && price < 100000) {
          prices.push(price);
        }
      }

      if (prices.length > 0) {
        prices.sort((a, b) => a - b);
        const median = prices[Math.floor(prices.length / 2)];
        const ebaySearchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_BIN=1`;
        return {
          price: Math.round(median * 100) / 100,
          source: `eBay via DuckDuckGo (median of ${prices.length} price${prices.length !== 1 ? "s" : ""})`,
          url: ebaySearchUrl,
        };
      }
    }
  } catch {
    // continue
  }

  // 3. Log manual lookup URL
  const query = barcode || name;
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_BIN=1`;
  console.log(
    `[enrichment] Automated price lookup failed for "${name}". Manual eBay search: ${ebayUrl}`
  );
  return null;
}

async function downloadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Backlogr/1.0; catalog app)",
      },
    });
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
