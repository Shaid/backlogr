import { prisma } from "@/lib/db";
import { downloadImage } from "@/lib/http";
import { itemWithRelationsInclude } from "@/lib/items";
import { lookupMarketPrice } from "@/lib/pricing";
import { scrapeHLJ } from "@/lib/scraper";

export function looksLikeModelKit(item: {
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

export async function enrichItem(itemId: string) {
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
        const res = await fetch(
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
        const res = await fetch(
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
      const ebayPrice = await lookupMarketPrice(item.name, item.barcode);
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
