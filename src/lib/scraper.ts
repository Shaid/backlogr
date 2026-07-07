import { fetchHtml } from "@/lib/http";

type HLJResult = {
  description?: string;
  category?: string;
  imageUrl?: string;
  price?: number;
  url: string;
};

function parseHLJProductPage(html: string, url: string): HLJResult | null {
  try {
    const dataLayerMatch = html.match(
      /window\.dataLayer\.push\(\{[\s\S]*?products:\s*\[\s*(\{[\s\S]*?\})\s*\]/,
    );
    if (!dataLayerMatch) return null;

    const raw = dataLayerMatch[1];

    function extractString(key: string): string | undefined {
      const m = raw.match(new RegExp(`"${key}":\\s*"([^"]*)"`, "i"));
      return m?.[1];
    }
    function extractNumber(key: string): number | undefined {
      const m = raw.match(new RegExp(`"${key}":\\s*(\\d+(?:\\.\\d+)?)`, "i"));
      return m ? parseFloat(m[1]) : undefined;
    }

    const result: HLJResult = { url };

    const metaDesc = extractString("meta_description");
    if (metaDesc) result.description = metaDesc;

    const category = extractString("category");
    if (category) result.category = category;

    const price = extractNumber("price");
    if (price && price > 0) {
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

async function findHljProductUrl(query: string): Promise<string | null> {
  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:hlj.com ${query}`)}`;
  const searchRes = await fetchHtml(ddgUrl);
  if (!searchRes.ok) {
    console.log(`[enrichment] DuckDuckGo search returned ${searchRes.status}`);
    return null;
  }
  const searchHtml = await searchRes.text();

  const urlMatches = searchHtml.matchAll(/uddg=(https%3A%2F%2Fwww\.hlj\.com%2F[a-z0-9%-]+)/gi);
  for (const match of urlMatches) {
    const decoded = decodeURIComponent(match[1]);
    if (
      !decoded.includes("/search") &&
      !decoded.includes("/browse") &&
      /[a-z]{2,6}\d{3,8}$/.test(decoded)
    ) {
      return decoded;
    }
  }
  return null;
}

export async function scrapeHLJ(
  name: string,
  barcode: string | null,
): Promise<(Omit<HLJResult, "url"> & { url?: string }) | null> {
  try {
    const query = barcode || name;
    const productUrl = await findHljProductUrl(query);
    if (!productUrl) {
      console.log(`[enrichment] No HLJ product URL found for "${name}"`);
      return null;
    }

    const productRes = await fetchHtml(productUrl);
    if (!productRes.ok) return null;
    const productHtml = await productRes.text();

    return parseHLJProductPage(productHtml, productUrl);
  } catch (err) {
    console.log(`[enrichment] HLJ scrape error: ${err}`);
    return null;
  }
}
