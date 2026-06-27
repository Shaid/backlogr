"use client";

import { ImagePlus } from "lucide-react";
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
  return (
    <form action={action} className="space-y-8 max-w-2xl mx-auto pb-8">
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
                  item?.purchaseDate ? new Date(item.purchaseDate).toISOString().split("T")[0] : ""
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
              <Input
                id="barcode"
                name="barcode"
                defaultValue={item?.barcode || ""}
                placeholder="UPC, EAN, or ISBN"
                className="font-mono"
              />
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
          <div className="space-y-2">
            <Label htmlFor="photo">Photo</Label>
            {item?.photo && (
              <div className="relative inline-block mb-2">
                <img
                  src={item.photo}
                  alt={item.name}
                  className="w-28 h-28 object-cover rounded-xl border border-border"
                />
                <label className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <input type="checkbox" name="removePhoto" value="true" className="rounded" />
                  Remove photo
                </label>
              </div>
            )}
            <label
              htmlFor="photo"
              className="flex items-center justify-center gap-2 w-full h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-muted/50 transition-all cursor-pointer text-sm text-muted-foreground"
            >
              <ImagePlus className="w-5 h-5" />
              <span>Click to upload a photo</span>
            </label>
            <Input id="photo" name="photo" type="file" accept="image/*" className="hidden" />
          </div>
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
  );
}
