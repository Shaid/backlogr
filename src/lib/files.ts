import fs from "node:fs/promises";
import path from "node:path";

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
