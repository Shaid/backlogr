export type ItemFormData = {
  name: string;
  description: string | null;
  category: string | null;
  quantity: number;
  purchaseDate: Date | null;
  value: number | null;
  condition: string | null;
  barcode: string | null;
  location: string | null;
  notes: string | null;
  tagsStr: string;
};

export function parseItemFormData(formData: FormData): ItemFormData {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const category = (formData.get("category") as string) || null;
  const quantity = parseInt(formData.get("quantity") as string, 10) || 1;
  const purchaseDateStr = formData.get("purchaseDate") as string;
  const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : null;
  const valueStr = formData.get("value") as string;
  const value = valueStr ? parseFloat(valueStr) : null;
  const condition = (formData.get("condition") as string) || null;
  const barcode = (formData.get("barcode") as string) || null;
  const location = (formData.get("location") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const tagsStr = (formData.get("tags") as string) || "";

  return {
    name,
    description,
    category,
    quantity,
    purchaseDate,
    value,
    condition,
    barcode,
    location,
    notes,
    tagsStr,
  };
}
