"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <form action={action} className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={item?.name || ""}
              placeholder="Item name"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={item?.description || ""}
              placeholder="Describe the item..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                defaultValue={item?.category || ""}
                placeholder="e.g. Electronics, Books"
              />
            </div>
            <div>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
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
            <div>
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
            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select
                name="condition"
                defaultValue={item?.condition || ""}
              >
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
            <div>
              <Label htmlFor="barcode">Barcode (UPC/EAN/ISBN)</Label>
              <Input
                id="barcode"
                name="barcode"
                defaultValue={item?.barcode || ""}
                placeholder="e.g. 9780134685991"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="location">Location / Room</Label>
            <Input
              id="location"
              name="location"
              defaultValue={item?.location || ""}
              placeholder="e.g. Living Room, Garage"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photo & Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="photo">Photo</Label>
            {item?.photo && (
              <div className="mb-2">
                <img
                  src={item.photo}
                  alt={item.name}
                  className="w-32 h-32 object-cover rounded-md"
                />
                <label className="flex items-center gap-2 mt-1 text-sm">
                  <input type="checkbox" name="removePhoto" value="true" />
                  Remove current photo
                </label>
              </div>
            )}
            <Input id="photo" name="photo" type="file" accept="image/*" />
          </div>
          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              name="tags"
              defaultValue={
                item?.tags.map((t) => t.tag.name).join(", ") || ""
              }
              placeholder="e.g. electronics, warranty, gift"
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={item?.notes || ""}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full h-12 text-base">
        {submitLabel}
      </Button>
    </form>
  );
}
