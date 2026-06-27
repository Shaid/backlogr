"use client";

import { ScanBarcode } from "lucide-react";
import { useCallback, useState } from "react";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ItemWithTags } from "@/types";

const CONDITIONS = ["New", "Like New", "Good", "Fair", "Poor"];

export function ItemForm({
  item,
  action,
  submitLabel,
}: {
  item?: ItemWithTags;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  const [barcode, setBarcode] = useState(item?.barcode || "");
  const [scannerOpen, setScannerOpen] = useState(false);
  const handleScan = useCallback((value: string) => {
    setBarcode(value);
    setScannerOpen(false);
  }, []);

  return (
    <>
      <form
        action={action}
        className="space-y-8 max-w-3xl mx-auto pb-8"
        encType="multipart/form-data"
      >
        {/* Basic Info */}
        <section className="space-y-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Basic Info
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={item?.name || ""}
                placeholder="What is this item?"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={item?.description || ""}
                placeholder="Add any details about this item..."
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">Supports Markdown</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  defaultValue={item?.category || ""}
                  placeholder="e.g. Electronics, Books"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min={1}
                  defaultValue={item?.quantity ?? 1}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="border-t border-border" />

        {/* Details */}
        <section className="space-y-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Details
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input
                  id="purchaseDate"
                  name="purchaseDate"
                  type="date"
                  defaultValue={
                    item?.purchaseDate
                      ? new Date(item.purchaseDate).toISOString().split("T")[0]
                      : ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Value ($)</Label>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={item?.value ?? ""}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Select name="condition" defaultValue={item?.condition || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="barcode"
                    name="barcode"
                    value={barcode}
                    onChange={(event) => setBarcode(event.target.value)}
                    placeholder="UPC, EAN, or ISBN"
                    className="h-11 font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 gap-2 sm:min-w-36"
                    onClick={() => setScannerOpen(true)}
                  >
                    <ScanBarcode className="size-4" />
                    Scan Barcode
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location / Room</Label>
              <Input
                id="location"
                name="location"
                defaultValue={item?.location || ""}
                placeholder="e.g. Living Room, Garage"
              />
            </div>
          </div>
        </section>

        <div className="border-t border-border" />

        {/* Photo & Tags */}
        <section className="space-y-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Photo & Tags
          </h2>
          <div className="space-y-4">
            <ImageUpload
              itemId={item?.id}
              itemName={item?.name}
              existingImages={item?.images}
              legacyPhotoUrl={item?.images.length ? null : item?.photo}
            />
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                name="tags"
                defaultValue={item?.tags.map((t) => t.tag.name).join(", ") || ""}
                placeholder="Separate tags with commas, e.g. electronics, warranty"
              />
              <p className="text-xs text-muted-foreground">Comma-separated list of tags</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={item?.notes || ""}
                placeholder="Any additional notes..."
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">Supports Markdown</p>
            </div>
          </div>
        </section>

        <Button type="submit" size="lg" className="w-full h-12 text-base font-medium">
          {submitLabel}
        </Button>
      </form>

      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleScan} />
    </>
  );
}
