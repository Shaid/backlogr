"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireCurrentUser, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/db";
import {
  ALLOWED_UPLOAD_TYPES,
  getImageExtensionForContentType,
  safeDeletePhoto,
  saveUploadedImages,
} from "@/lib/files";
import {
  buildCreateImagePayload,
  getImageFilesFromFormData,
  syncItemImagesFromFormData,
} from "@/lib/item-images";
import { itemWithRelationsInclude } from "@/lib/items";
import type { Role } from "@/lib/permissions";

const VALID_ROLES = new Set<Role>(["admin", "editor", "viewer", "owner"]);

const FETCH_TIMEOUT_MS = 8_000;
const MAX_IMAGE_DOWNLOAD_SIZE = 10 * 1024 * 1024; // 10MB

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

export async function createItem(formData: FormData) {
  const user = await requirePermission("create");
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const category = (formData.get("category") as string) || null;
  const quantity = parseInt(formData.get("quantity") as string, 10) || 1;
  const purchaseDateStr = formData.get("purchaseDate") as string;
  const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : null;
  const valueStr = formData.get("value") as string;
  const value = valueStr ? parseFloat(valueStr) : null;
  const condition = (formData.get("condition") as string) || null;
  const barcode = (formData.get("barcode") as string) || null;
  const location = (formData.get("location") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const tagsStr = (formData.get("tags") as string) || "";
  const imagePayload = await buildCreateImagePayload(formData);

  // Parse tags
  const tagNames = tagsStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const item = await (async () => {
    try {
      return await prisma.item.create({
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
          userId: user.id,
          photo: imagePayload.photo,
          enrichStatus: barcode || name ? "pending" : "none",
          images: {
            create: imagePayload.images,
          },
          tags: {
            create: await Promise.all(
              tagNames.map(async (tagName) => {
                const tag = await prisma.tag.upsert({
                  where: { name: tagName },
                  update: {},
                  create: { name: tagName },
                });
                return { tagId: tag.id };
              }),
            ),
          },
        },
      });
    } catch (error) {
      await Promise.all(imagePayload.images.map((image) => safeDeletePhoto(image.url)));
      throw error;
    }
  })();

  // Trigger enrichment in background (fire and forget)
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

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const category = (formData.get("category") as string) || null;
  const quantity = parseInt(formData.get("quantity") as string, 10) || 1;
  const purchaseDateStr = formData.get("purchaseDate") as string;
  const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : null;
  const valueStr = formData.get("value") as string;
  const value = valueStr ? parseFloat(valueStr) : null;
  const condition = (formData.get("condition") as string) || null;
  const barcode = (formData.get("barcode") as string) || null;
  const location = (formData.get("location") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const tagsStr = (formData.get("tags") as string) || "";

  const tagNames = tagsStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const uploadedImageUrls = await saveUploadedImages(getImageFilesFromFormData(formData));

  // Wrap tag delete + recreate in a transaction for atomicity
  let deletedImageUrls: string[] = [];
  try {
    deletedImageUrls = await prisma.$transaction(async (tx) => {
      await tx.tagOnItem.deleteMany({ where: { itemId: id } });

      const tagConnections = await Promise.all(
        tagNames.map(async (tagName) => {
          const tag = await tx.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          });
          return { tagId: tag.id };
        }),
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
  const imageUrls = new Set<string>();
  if (item.photo) {
    imageUrls.add(item.photo);
  }
  for (const image of item.images) {
    imageUrls.add(image.url);
  }

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

// Exported wrapper for triggering enrichment from API routes
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

async function enrichItem(itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: itemWithRelationsInclude,
  });
  if (!item) return;

  try {
    const enrichedData: {
      description?: string;
      photo?: string;
      category?: string;
      marketPrice?: number;
      priceSource?: string;
      sourceUrl?: string;
    } = {};
    let enrichedImageUrl: string | null = null;

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
        if (!item.photo && item.images.length === 0 && hljData.imageUrl) {
          const photoPath = await downloadImage(hljData.imageUrl);
          if (photoPath) {
            enrichedData.photo = photoPath;
            enrichedImageUrl = photoPath;
          }
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
        const res = await fetchWithTimeout(
          `https://world.openfoodfacts.org/api/v0/product/${item.barcode}.json`,
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
          if (!item.photo && item.images.length === 0 && product.image_url) {
            const photoPath = await downloadImage(product.image_url);
            if (photoPath) {
              enrichedData.photo = photoPath;
              enrichedImageUrl = photoPath;
            }
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
        const res = await fetchWithTimeout(
          `https://openlibrary.org/api/books?bibkeys=ISBN:${item.barcode}&format=json&jscmd=data`,
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
          if (!item.photo && item.images.length === 0 && book.cover?.large) {
            const photoPath = await downloadImage(book.cover.large);
            if (photoPath) {
              enrichedData.photo = photoPath;
              enrichedImageUrl = photoPath;
            }
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
        ...(enrichedImageUrl
          ? {
              images: {
                create: {
                  url: enrichedImageUrl,
                  isHero: true,
                  sortOrder: 0,
                },
              },
            }
          : {}),
        enrichStatus: Object.keys(enrichedData).length > 0 ? "complete" : "failed",
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
  barcode: string | null,
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

    const searchRes = await fetchWithTimeout(ddgUrl, {
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
    const urlMatches = searchHtml.matchAll(/uddg=(https%3A%2F%2Fwww\.hlj\.com%2F[a-z0-9%-]+)/gi);
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
    const productRes = await fetchWithTimeout(productUrl, {
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
  url: string,
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
      /window\.dataLayer\.push\(\{[\s\S]*?products:\s*\[\s*(\{[\s\S]*?\})\s*\]/,
    );
    if (!dataLayerMatch) return null;

    const raw = dataLayerMatch[1];

    // Parse HLJ dataLayer: it uses double-quoted keys/values in practice.
    // Use regex extraction which safely handles apostrophes in values.
    function extractString(key: string): string | undefined {
      const m = raw.match(new RegExp(`"${key}":\\s*"([^"]*)"`, "i"));
      return m?.[1];
    }
    function extractNumber(key: string): number | undefined {
      const m = raw.match(new RegExp(`"${key}":\\s*(\\d+(?:\\.\\d+)?)`, "i"));
      return m ? parseFloat(m[1]) : undefined;
    }

    const result: {
      description?: string;
      category?: string;
      imageUrl?: string;
      price?: number;
      url: string;
    } = { url };

    const metaDesc = extractString("meta_description");
    if (metaDesc) result.description = metaDesc;

    const category = extractString("category");
    if (category) result.category = category;

    const price = extractNumber("price");
    if (price && price > 0) {
      // HLJ prices are in JPY — approximate USD conversion
      result.price = Math.round((price / 150) * 100) / 100;
    }

    const sku = extractString("sku");
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
  barcode: string | null,
): Promise<{ price: number; source: string; url: string } | null> {
  // 1. Try UPCitemdb.com (free barcode lookup with pricing)
  if (barcode) {
    try {
      const res = await fetchWithTimeout(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
        {
          headers: { Accept: "application/json" },
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.items?.[0]?.offers) {
          const offers = data.items[0].offers as {
            price?: number;
            link?: string;
            merchant?: string;
          }[];
          const prices = offers.filter((o) => o.price && o.price > 0).map((o) => o.price as number);
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

    const res = await fetchWithTimeout(ddgUrl, {
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
    `[enrichment] Automated price lookup failed for "${name}". Manual eBay search: ${ebayUrl}`,
  );
  return null;
}

/** Block requests to private/reserved IP ranges (SSRF protection) */
function isPrivateUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    // Only allow http/https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;
    const hostname = parsed.hostname;
    // Block obvious private/reserved hostnames
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    )
      return true;
    // Block private IP ranges
    const parts = hostname.split(".").map(Number);
    if (parts.length === 4 && parts.every((p) => !Number.isNaN(p))) {
      if (parts[0] === 10) return true; // 10.0.0.0/8
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
      if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
      if (parts[0] === 169 && parts[1] === 254) return true; // link-local
      if (parts[0] === 127) return true; // loopback
      if (parts[0] === 0) return true; // 0.0.0.0/8
    }
    return false;
  } catch {
    return true;
  }
}

async function downloadImage(url: string): Promise<string | null> {
  // SSRF protection: block private/reserved URLs
  if (isPrivateUrl(url)) {
    console.warn(`[enrichment] Blocked private/reserved URL: ${url}`);
    return null;
  }

  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Backlogr/1.0; catalog app)",
      },
      redirect: "manual",
    });

    // Handle redirects manually to check destination
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location || isPrivateUrl(new URL(location, url).href)) {
        console.warn(`[enrichment] Blocked redirect to private URL from: ${url}`);
        return null;
      }
      // Follow one level of redirect only
      return downloadImage(new URL(location, url).href);
    }

    if (!res.ok) return null;

    // Validate content type
    const contentType = res.headers.get("content-type")?.split(";")[0].trim();
    if (!contentType || !ALLOWED_UPLOAD_TYPES.has(contentType)) {
      console.warn(`[enrichment] Invalid image content-type (${contentType}): ${url}`);
      return null;
    }

    // Guard against oversized downloads
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_DOWNLOAD_SIZE) {
      console.warn(`[enrichment] Image too large (${contentLength} bytes): ${url}`);
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_IMAGE_DOWNLOAD_SIZE) {
      console.warn(`[enrichment] Downloaded image too large (${buffer.length} bytes): ${url}`);
      return null;
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    // Derive extension from content-type, not URL
    const ext = getImageExtensionForContentType(contentType);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = path.join(uploadDir, filename);

    await fs.writeFile(filePath, buffer);
    return `/uploads/${filename}`;
  } catch {
    return null;
  }
}
