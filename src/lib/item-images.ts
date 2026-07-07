import type { Item, ItemImage, Prisma } from "@/generated/prisma/client";
import { saveUploadedImages } from "@/lib/files";
import { LEGACY_IMAGE_TOKEN } from "@/lib/items";

export type { LEGACY_IMAGE_TOKEN };

export type ItemWithImages = Pick<Item, "id" | "photo"> & {
  images: Pick<ItemImage, "id" | "url" | "isHero" | "sortOrder" | "createdAt">[];
};

type ImageDraft = {
  key: string;
  url: string;
  kind: "existing" | "legacy" | "new";
  imageId?: string;
};

type SyncItemImagesResult = {
  photo: string | null;
  deletedUrls: string[];
};

export function getImageFilesFromFormData(formData: FormData): File[] {
  const files = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const legacyPhoto = formData.get("photo");

  if (legacyPhoto instanceof File && legacyPhoto.size > 0) {
    files.push(legacyPhoto);
  }

  return files;
}

function hasImageMutationFields(formData: FormData) {
  return (
    formData.has("images") ||
    formData.has("photo") ||
    formData.has("imageOrder") ||
    formData.has("heroImage") ||
    formData.has("removedImageIds")
  );
}

function dedupeKeys(keys: string[]) {
  return [...new Set(keys.filter(Boolean))];
}

function normalizeDrafts(
  orderTokens: string[],
  drafts: ImageDraft[],
  heroToken: string | null,
): { orderedDrafts: ImageDraft[]; heroKey: string | null } {
  const draftMap = new Map(drafts.map((draft) => [draft.key, draft]));
  const orderedKeys = dedupeKeys(orderTokens).filter((token) => draftMap.has(token));
  const remainingKeys = drafts
    .map((draft) => draft.key)
    .filter((key) => !orderedKeys.includes(key));
  const orderedDrafts = [...orderedKeys, ...remainingKeys]
    .map((key) => draftMap.get(key))
    .filter((draft): draft is ImageDraft => Boolean(draft));

  const resolvedHeroKey = orderedDrafts.some((draft) => draft.key === heroToken)
    ? heroToken
    : (orderedDrafts[0]?.key ?? null);

  return { orderedDrafts, heroKey: resolvedHeroKey };
}

export async function buildCreateImagePayload(formData: FormData) {
  const files = getImageFilesFromFormData(formData);
  const uploadedUrls = await saveUploadedImages(files);
  const drafts = uploadedUrls.map((url, index) => ({
    key: `new:${index}`,
    kind: "new" as const,
    url,
  }));
  const { orderedDrafts, heroKey } = normalizeDrafts(
    formData.getAll("imageOrder").map(String),
    drafts,
    (formData.get("heroImage") as string | null) ?? null,
  );

  const images = orderedDrafts.map((draft, index) => ({
    url: draft.url,
    isHero: draft.key === heroKey,
    sortOrder: index,
  }));

  return {
    images,
    photo: images.find((image) => image.isHero)?.url ?? images[0]?.url ?? null,
  };
}

export async function syncItemImagesFromFormData(
  tx: Prisma.TransactionClient,
  item: ItemWithImages,
  formData: FormData,
  uploadedUrls: string[] = [],
): Promise<SyncItemImagesResult> {
  if (!hasImageMutationFields(formData)) {
    return { photo: item.photo, deletedUrls: [] };
  }

  const removedTokens = new Set(formData.getAll("removedImageIds").map(String));
  const orderTokens = formData.getAll("imageOrder").map(String);
  const heroToken = (formData.get("heroImage") as string | null) ?? null;
  const existingImages = [...item.images].sort((a, b) => a.sortOrder - b.sortOrder);

  const drafts: ImageDraft[] = existingImages
    .filter((image) => !removedTokens.has(image.id) && !removedTokens.has(`existing:${image.id}`))
    .map((image) => ({
      key: `existing:${image.id}`,
      kind: "existing",
      imageId: image.id,
      url: image.url,
    }));

  const legacyPhotoUrl = existingImages.length === 0 ? item.photo : null;
  if (legacyPhotoUrl && !removedTokens.has(LEGACY_IMAGE_TOKEN)) {
    drafts.push({
      key: LEGACY_IMAGE_TOKEN,
      kind: "legacy",
      url: legacyPhotoUrl,
    });
  }

  drafts.push(
    ...uploadedUrls.map((url, index) => ({
      key: `new:${index}`,
      kind: "new" as const,
      url,
    })),
  );

  const { orderedDrafts, heroKey } = normalizeDrafts(orderTokens, drafts, heroToken);

  const keptExistingIds = orderedDrafts
    .filter((draft) => draft.kind === "existing" && draft.imageId)
    .map((draft) => draft.imageId as string);

  const deletedExistingImages = existingImages.filter(
    (image) => !keptExistingIds.includes(image.id),
  );

  if (deletedExistingImages.length > 0) {
    await tx.itemImage.deleteMany({
      where: { id: { in: deletedExistingImages.map((image) => image.id) } },
    });
  }

  await Promise.all(
    orderedDrafts.flatMap((draft, index) => {
      const isHero = draft.key === heroKey;

      if (draft.kind === "existing" && draft.imageId) {
        return [
          tx.itemImage.update({
            where: { id: draft.imageId },
            data: {
              sortOrder: index,
              isHero,
            },
          }),
        ];
      }

      return [
        tx.itemImage.create({
          data: {
            itemId: item.id,
            url: draft.url,
            sortOrder: index,
            isHero,
          },
        }),
      ];
    }),
  );

  const photo =
    orderedDrafts.find((draft) => draft.key === heroKey)?.url ?? orderedDrafts[0]?.url ?? null;
  const keptUrls = new Set(orderedDrafts.map((draft) => draft.url));
  const deletedUrls = deletedExistingImages
    .map((image) => image.url)
    .filter((url) => !keptUrls.has(url));

  if (legacyPhotoUrl && !orderedDrafts.some((draft) => draft.key === LEGACY_IMAGE_TOKEN)) {
    deletedUrls.push(legacyPhotoUrl);
  }

  return {
    photo,
    deletedUrls: [...new Set(deletedUrls.filter((url) => url !== photo))],
  };
}

export async function normalizeApiImages(input: unknown): Promise<{
  images: { url: string; isHero: boolean; sortOrder: number }[];
  photo: string | null;
}> {
  const isLocalUploadUrl = (url: string) => url.startsWith("/uploads/") && !url.includes("..");

  if (!Array.isArray(input)) {
    return { images: [], photo: null };
  }

  const normalized = input
    .map((entry, index) => {
      if (typeof entry === "string") {
        const url = entry.trim();
        if (!isLocalUploadUrl(url)) {
          return null;
        }

        return {
          url,
          isHero: false,
          sortOrder: index,
        };
      }

      if (
        !entry ||
        typeof entry !== "object" ||
        typeof (entry as { url?: unknown }).url !== "string"
      ) {
        return null;
      }

      const image = entry as { url: string; isHero?: boolean; sortOrder?: number };
      const url = image.url.trim();
      if (!isLocalUploadUrl(url)) {
        return null;
      }

      return {
        url,
        isHero: Boolean(image.isHero),
        sortOrder: typeof image.sortOrder === "number" ? image.sortOrder : index,
      };
    })
    .filter((entry): entry is { url: string; isHero: boolean; sortOrder: number } =>
      Boolean(entry?.url),
    );

  const ordered = normalized
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((image, index) => ({
      ...image,
      sortOrder: index,
    }));

  const heroIndex = ordered.findIndex((image) => image.isHero);
  const normalizedHeroIndex = heroIndex >= 0 ? heroIndex : ordered.length > 0 ? 0 : -1;

  return {
    images: ordered.map((image, index) => ({
      ...image,
      isHero: index === normalizedHeroIndex,
      sortOrder: index,
    })),
    photo: ordered[normalizedHeroIndex]?.url ?? null,
  };
}
