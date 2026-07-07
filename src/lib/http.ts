import fs from "node:fs/promises";
import path from "node:path";
import { ALLOWED_UPLOAD_TYPES, getImageExtensionForContentType } from "@/lib/files";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_IMAGE_DOWNLOAD_SIZE = 10 * 1024 * 1024; // 10MB

const USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0";

export function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

export function fetchHtml(url: string): Promise<Response> {
  return fetchWithTimeout(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
  });
}

/** Block requests to private/reserved IP ranges (SSRF protection) */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;
    const hostname = parsed.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    )
      return true;
    const parts = hostname.split(".").map(Number);
    if (parts.length === 4 && parts.every((p) => !Number.isNaN(p))) {
      if (parts[0] === 10) return true;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      if (parts[0] === 192 && parts[1] === 168) return true;
      if (parts[0] === 169 && parts[1] === 254) return true;
      if (parts[0] === 127) return true;
      if (parts[0] === 0) return true;
    }
    return false;
  } catch {
    return true;
  }
}

async function downloadImageUnsafe(url: string): Promise<string | null> {
  if (isPrivateUrl(url)) {
    console.warn(`[enrichment] Blocked private/reserved URL: ${url}`);
    return null;
  }

  try {
    const res = await fetchWithTimeout(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Backlogr/1.0; catalog app)" },
      redirect: "manual",
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location || isPrivateUrl(new URL(location, url).href)) {
        console.warn(`[enrichment] Blocked redirect to private URL from: ${url}`);
        return null;
      }
      return downloadImageUnsafe(new URL(location, url).href);
    }

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type")?.split(";")[0].trim();
    if (!contentType || !ALLOWED_UPLOAD_TYPES.has(contentType)) {
      console.warn(`[enrichment] Invalid image content-type (${contentType}): ${url}`);
      return null;
    }

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

    const ext = getImageExtensionForContentType(contentType);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = path.join(uploadDir, filename);

    await fs.writeFile(filePath, buffer);
    return `/uploads/${filename}`;
  } catch {
    return null;
  }
}

export { downloadImageUnsafe as downloadImage };
