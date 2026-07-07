import { fetchHtml, fetchWithTimeout } from "@/lib/http";

export function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export function formatPriceSource(label: string, count: number): string {
  return `${label} (median of ${count} offer${count !== 1 ? "s" : ""})`;
}

async function searchEbayPrice(
  name: string,
  barcode: string | null,
): Promise<{ price: number; source: string; url: string } | null> {
  // 1. Try UPCitemdb.com (barcode → offers with pricing)
  if (barcode) {
    try {
      const res = await fetchWithTimeout(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
        { headers: { Accept: "application/json" } },
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
          const med = median(prices);
          if (med !== undefined) {
            return {
              price: Math.round(med * 100) / 100,
              source: formatPriceSource("UPCitemdb", prices.length),
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
    const res = await fetchHtml(ddgUrl);
    if (res.ok) {
      const html = await res.text();
      const prices: number[] = [];
      const priceMatches = html.matchAll(/\$([\d,]+\.\d{2})/g);
      for (const match of priceMatches) {
        const price = parseFloat(match[1].replace(/,/g, ""));
        if (price > 1 && price < 100000) {
          prices.push(price);
        }
      }
      const med = median(prices);
      if (med !== undefined) {
        return {
          price: Math.round(med * 100) / 100,
          source: formatPriceSource("eBay via DuckDuckGo", prices.length),
          url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_BIN=1`,
        };
      }
    }
  } catch {
    // continue
  }

  return null;
}

export async function lookupMarketPrice(
  name: string,
  barcode: string | null,
): Promise<{ price: number; source: string; url: string } | null> {
  const result = await searchEbayPrice(name, barcode);
  if (!result) {
    const query = barcode || name;
    console.log(
      `[enrichment] Automated price lookup failed for "${name}". Manual eBay search: https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_BIN=1`,
    );
  }
  return result;
}
