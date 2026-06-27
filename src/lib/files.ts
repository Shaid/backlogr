import fs from "node:fs/promises";
import path from "node:path";

export const ALLOWED_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function sanitizeFileBasename(filename: string): string {
  const basename = filename
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase();
  const sanitized = basename
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return sanitized || "image";
}

export async function saveUploadedImage(file: File): Promise<string> {
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF`);
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: 10MB`);
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const ext = EXT_MAP[file.type] ?? ".jpg";
  const safeName = sanitizeFileBasename(file.name || "image");
  const filename = `${Date.now()}-${safeName}-${Math.random().toString(36).slice(2, 10)}${ext}`;
  const filePath = path.join(uploadDir, filename);

  await fs.writeFile(filePath, buffer);
  return `/uploads/${filename}`;
}

export async function saveUploadedImages(files: File[]): Promise<string[]> {
  const uploadedUrls: string[] = [];

  try {
    for (const file of files) {
      uploadedUrls.push(await saveUploadedImage(file));
    }

    return uploadedUrls;
  } catch (error) {
    await Promise.all(uploadedUrls.map((imageUrl) => safeDeletePhoto(imageUrl)));
    throw error;
  }
}

export function getImageExtensionForContentType(contentType: string): string {
  return EXT_MAP[contentType] ?? ".jpg";
}

/**
 * Safely delete a photo file, preventing path traversal.
 * Validates that the resolved path stays within public/.
 */
export async function safeDeletePhoto(photo: string): Promise<void> {
  const publicDir = path.join(process.cwd(), "public");
  const filePath = path.resolve(publicDir, photo.replace(/^\//, ""));
  if (!filePath.startsWith(publicDir + path.sep)) {
    console.warn("[security] Refusing to delete file outside public/:", filePath);
    return;
  }
  await fs.unlink(filePath).catch(() => {});
}
