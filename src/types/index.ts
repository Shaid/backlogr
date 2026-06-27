export type Item = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  quantity: number;
  purchaseDate: Date | null;
  value: number | null;
  condition: string | null;
  photo: string | null;
  barcode: string | null;
  location: string | null;
  notes: string | null;
  enrichStatus: string;
  marketPrice: number | null;
  priceSource: string | null;
  sourceUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Tag = {
  id: string;
  name: string;
};

export type TagOnItem = {
  itemId: string;
  tagId: string;
};

export type ItemWithTags = Item & {
  tags: (TagOnItem & { tag: Tag })[];
};
