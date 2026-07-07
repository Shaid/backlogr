"use client";

import {
  Camera,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LEGACY_IMAGE_TOKEN } from "@/lib/items";
import { cn } from "@/lib/utils";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type ExistingImage = {
  id: string;
  url: string;
  isHero: boolean;
  sortOrder: number;
};

type UploadImage = {
  id: string;
  kind: "existing" | "legacy" | "new";
  url: string;
  label: string;
  progress: number;
  serverId?: string;
  file?: File;
};

type ImageUploadProps = {
  itemId?: string;
  itemName?: string;
  existingImages?: ExistingImage[];
  legacyPhotoUrl?: string | null;
};

function makeImageId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function tokenForImage(image: UploadImage, newIndexMap: Map<string, number>) {
  if (image.kind === "existing" && image.serverId) {
    return `existing:${image.serverId}`;
  }

  if (image.kind === "legacy") {
    return LEGACY_IMAGE_TOKEN;
  }

  const newIndex = newIndexMap.get(image.id);
  return typeof newIndex === "number" ? `new:${newIndex}` : null;
}

export function ImageUpload({
  itemId,
  itemName,
  existingImages = [],
  legacyPhotoUrl,
}: ImageUploadProps) {
  const initialImages = useMemo<UploadImage[]>(() => {
    if (existingImages.length > 0) {
      return [...existingImages]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((image) => ({
          id: `existing-${image.id}`,
          kind: "existing" as const,
          serverId: image.id,
          url: image.url,
          label: image.isHero ? "Hero" : "Saved",
          progress: 100,
        }));
    }

    if (legacyPhotoUrl) {
      return [
        {
          id: "legacy-photo",
          kind: "legacy",
          url: legacyPhotoUrl,
          label: "Legacy photo",
          progress: 100,
        },
      ];
    }

    return [];
  }, [existingImages, legacyPhotoUrl]);

  const [images, setImages] = useState(initialImages);
  const [heroId, setHeroId] = useState<string | null>(() => {
    const heroImage = existingImages.find((image) => image.isHero) ?? existingImages[0];
    return heroImage ? `existing-${heroImage.id}` : legacyPhotoUrl ? "legacy-photo" : null;
  });
  const [dragActive, setDragActive] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [heroSavingId, setHeroSavingId] = useState<string | null>(null);
  const [removedTokens, setRemovedTokens] = useState<string[]>([]);
  const browseInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setImages(initialImages);
    setRemovedTokens([]);
    const nextHeroImage = existingImages.find((image) => image.isHero) ?? existingImages[0];
    setHeroId(
      nextHeroImage ? `existing-${nextHeroImage.id}` : legacyPhotoUrl ? "legacy-photo" : null,
    );
  }, [existingImages, initialImages, legacyPhotoUrl]);

  useEffect(() => {
    const currentHeroExists = heroId && images.some((image) => image.id === heroId);
    if (!currentHeroExists) {
      setHeroId(images[0]?.id ?? null);
    }
  }, [heroId, images]);

  useEffect(() => {
    if (!browseInputRef.current || typeof DataTransfer === "undefined") {
      return;
    }

    const dataTransfer = new DataTransfer();
    for (const image of images) {
      if (image.kind === "new" && image.file) {
        dataTransfer.items.add(image.file);
      }
    }

    browseInputRef.current.files = dataTransfer.files;
  }, [images]);

  useEffect(() => {
    return () => {
      for (const previewUrl of previewUrlsRef.current) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  const newIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let nextIndex = 0;

    for (const image of images) {
      if (image.kind === "new") {
        map.set(image.id, nextIndex);
        nextIndex += 1;
      }
    }

    return map;
  }, [images]);

  async function setHeroImage(image: UploadImage) {
    if (heroId === image.id) {
      return;
    }

    if (itemId && image.kind === "existing" && image.serverId) {
      try {
        setHeroSavingId(image.id);
        const response = await fetch(`/api/items/${itemId}/images/${image.serverId}/hero`, {
          method: "PUT",
        });

        if (!response.ok) {
          throw new Error("Failed to update hero image");
        }
      } catch (error) {
        console.error(error);
        toast.error("Could not set the hero image");
        return;
      } finally {
        setHeroSavingId(null);
      }
    }

    setHeroId(image.id);
  }

  function reorderImages(fromId: string, toId: string) {
    if (fromId === toId) {
      return;
    }

    setImages((currentImages) => {
      const fromIndex = currentImages.findIndex((image) => image.id === fromId);
      const toIndex = currentImages.findIndex((image) => image.id === toId);
      if (fromIndex === -1 || toIndex === -1) {
        return currentImages;
      }

      const nextImages = [...currentImages];
      const [movedImage] = nextImages.splice(fromIndex, 1);
      nextImages.splice(toIndex, 0, movedImage);
      return nextImages;
    });
  }

  function moveImage(imageId: string, direction: -1 | 1) {
    setImages((currentImages) => {
      const index = currentImages.findIndex((image) => image.id === imageId);
      if (index === -1) {
        return currentImages;
      }

      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= currentImages.length) {
        return currentImages;
      }

      const nextImages = [...currentImages];
      const [movedImage] = nextImages.splice(index, 1);
      nextImages.splice(targetIndex, 0, movedImage);
      return nextImages;
    });
  }

  function validateFiles(fileList: FileList | File[]) {
    const nextFiles = Array.from(fileList);
    const validFiles: File[] = [];

    for (const file of nextFiles) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a supported image`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is larger than 10MB`);
        continue;
      }

      validFiles.push(file);
    }

    return validFiles;
  }

  function addFiles(fileList: FileList | File[]) {
    const validFiles = validateFiles(fileList);
    if (validFiles.length === 0) {
      return;
    }

    const nextImages = validFiles.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(previewUrl);

      return {
        id: makeImageId("new"),
        kind: "new" as const,
        url: previewUrl,
        label: "Ready",
        file,
        progress: 100,
      };
    });

    setImages((currentImages) => [...currentImages, ...nextImages]);
    setHeroId((currentHero) => currentHero ?? nextImages[0]?.id ?? null);
  }

  async function removeImage(image: UploadImage) {
    if (itemId && image.kind === "existing" && image.serverId) {
      try {
        setDeletingId(image.id);
        const response = await fetch(`/api/items/${itemId}/images/${image.serverId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete image");
        }
      } catch (error) {
        console.error(error);
        toast.error("Could not delete the image");
        setDeletingId(null);
        return;
      }
    }

    if (image.kind === "new") {
      previewUrlsRef.current.delete(image.url);
      URL.revokeObjectURL(image.url);
    }

    if (image.kind === "legacy") {
      setRemovedTokens((currentTokens) => [...currentTokens, LEGACY_IMAGE_TOKEN]);
    }

    setImages((currentImages) =>
      currentImages.filter((currentImage) => currentImage.id !== image.id),
    );
    setDeletingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <Label htmlFor="item-images">Images</Label>
          <p className="text-xs text-muted-foreground">
            Add up to several angles, pick a hero image, and drag to reorder.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {images.length} image{images.length === 1 ? "" : "s"}
        </span>
      </div>

      <label
        htmlFor="item-images"
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) {
            setDragActive(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          if (event.dataTransfer.files.length > 0) {
            addFiles(event.dataTransfer.files);
          }
        }}
        className={cn(
          "block rounded-2xl border-2 border-dashed p-4 transition-colors",
          dragActive
            ? "border-primary bg-primary/5 shadow-[0_0_0_1px] shadow-primary/30"
            : "border-border bg-muted/20",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Upload className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Drag photos here or tap to browse</p>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, WebP, or GIF up to 10MB each.
            </p>
          </div>
        </div>
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-2"
          onClick={() => browseInputRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          Browse files
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 gap-2"
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="size-4" />
          Take photo
        </Button>
      </div>

      <Input
        ref={browseInputRef}
        id="item-images"
        name="images"
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) {
            addFiles(event.target.files);
          }
          event.target.value = "";
        }}
      />
      <Input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) {
            addFiles(event.target.files);
          }
          event.target.value = "";
        }}
      />

      {images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => {
            const isHero = heroId === image.id;
            const token = tokenForImage(image, newIndexMap);

            return (
              <li
                key={image.id}
                draggable
                onDragStart={() => setDraggedId(image.id)}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggedId) {
                    reorderImages(draggedId, image.id);
                  }
                  setDraggedId(null);
                }}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-card transition-shadow",
                  isHero ? "border-primary shadow-[0_0_0_1px] shadow-primary/30" : "border-border",
                )}
              >
                <div className="relative aspect-square bg-muted/30">
                  <img
                    src={image.url}
                    alt={itemName || "Item image"}
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2">
                    <span className="rounded-full bg-black/70 px-2 py-1 text-[11px] font-medium text-white">
                      {isHero ? "Hero" : image.label}
                    </span>
                    <span className="rounded-full bg-black/70 p-1 text-white">
                      <GripVertical className="size-3.5" />
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${image.progress}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>#{index + 1}</span>
                    {token && <span className="truncate">{image.file?.name || "Saved image"}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={isHero ? "default" : "outline"}
                      className="min-h-11 gap-1.5"
                      onClick={() => void setHeroImage(image)}
                      disabled={heroSavingId === image.id}
                    >
                      {heroSavingId === image.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Star className="size-4" />
                      )}
                      Hero
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => void removeImage(image)}
                      disabled={deletingId === image.id}
                    >
                      {deletingId === image.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                      Delete
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11 gap-1.5"
                      onClick={() => moveImage(image.id, -1)}
                      disabled={index === 0}
                    >
                      <ChevronLeft className="size-4" />
                      Earlier
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11 gap-1.5"
                      onClick={() => moveImage(image.id, 1)}
                      disabled={index === images.length - 1}
                    >
                      Later
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground">
          Add images to create a swipeable gallery and choose the main thumbnail.
        </div>
      )}

      {images.map((image) => {
        const token = tokenForImage(image, newIndexMap);
        return token ? (
          <input key={`${image.id}-order`} type="hidden" name="imageOrder" value={token} />
        ) : null;
      })}
      {heroId &&
        (() => {
          const heroImage = images.find((image) => image.id === heroId);
          const token = heroImage ? tokenForImage(heroImage, newIndexMap) : null;
          return token ? <input type="hidden" name="heroImage" value={token} /> : null;
        })()}
      {removedTokens.map((token) => (
        <input key={token} type="hidden" name="removedImageIds" value={token} />
      ))}
    </div>
  );
}
