// Mock Prisma before any imports
// biome-ignore lint/suspicious/noExplicitAny: Jest mock shape is intentionally dynamic.
const mockPrisma: any = {
  item: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  tag: {
    upsert: jest.fn(),
  },
  tagOnItem: {
    deleteMany: jest.fn(),
  },
  itemImage: {
    deleteMany: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
};
mockPrisma.$transaction = jest.fn((fn: (tx: unknown) => unknown) => fn(mockPrisma));

jest.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

const mockAuth = jest.fn();

jest.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

jest.mock("@/lib/tags", () => ({
  resolveTagConnections: jest.fn().mockResolvedValue([]),
}));

// Mock fs
jest.mock("node:fs/promises", () => ({
  unlink: jest.fn().mockResolvedValue(undefined),
}));

import { NextRequest } from "next/server";
import { DELETE, GET, PUT } from "@/app/api/items/[id]/route";

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), init as never);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const sampleItem = {
  id: "test-id-1",
  name: "Test Item",
  description: "A test item",
  category: "Electronics",
  quantity: 1,
  purchaseDate: null,
  value: 29.99,
  condition: "New",
  photo: null,
  barcode: "1234567890",
  location: "Office",
  notes: null,
  enrichStatus: "none",
  userId: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  images: [],
  tags: [
    {
      itemId: "test-id-1",
      tagId: "tag-1",
      tag: { id: "tag-1", name: "gadget" },
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({
    user: {
      id: "user-1",
      role: "editor",
      name: "Editor",
      email: "editor@example.com",
    },
  });
});

describe("GET /api/items/:id", () => {
  it("returns the item when found", async () => {
    mockPrisma.item.findUnique.mockResolvedValue(sampleItem);

    const req = makeRequest("http://localhost:3000/api/items/test-id-1");
    const res = await GET(req, makeParams("test-id-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.name).toBe("Test Item");
    expect(body.tags).toHaveLength(1);
  });

  it("returns 404 when item not found", async () => {
    mockPrisma.item.findUnique.mockResolvedValue(null);

    const req = makeRequest("http://localhost:3000/api/items/nonexistent");
    const res = await GET(req, makeParams("nonexistent"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Item not found");
  });
});

describe("PUT /api/items/:id", () => {
  it("updates an existing item", async () => {
    mockPrisma.item.findUnique.mockResolvedValue(sampleItem);
    mockPrisma.tagOnItem.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.item.update.mockResolvedValue({
      ...sampleItem,
      name: "Updated Item",
      tags: [],
    });

    const req = makeRequest("http://localhost:3000/api/items/test-id-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Item" }),
    });

    const res = await PUT(req, makeParams("test-id-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.name).toBe("Updated Item");
    expect(mockPrisma.tagOnItem.deleteMany).toHaveBeenCalledWith({
      where: { itemId: "test-id-1" },
    });
  });

  it("returns 404 when updating nonexistent item", async () => {
    mockPrisma.item.findUnique.mockResolvedValue(null);

    const req = makeRequest("http://localhost:3000/api/items/nonexistent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nope" }),
    });

    const res = await PUT(req, makeParams("nonexistent"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Item not found");
  });

  it("updates tags by removing old and adding new", async () => {
    mockPrisma.item.findUnique.mockResolvedValue(sampleItem);
    mockPrisma.tagOnItem.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.item.update.mockResolvedValue({
      ...sampleItem,
      tags: [
        {
          itemId: "test-id-1",
          tagId: "tag-2",
          tag: { id: "tag-2", name: "new-tag" },
        },
      ],
    });

    const req = makeRequest("http://localhost:3000/api/items/test-id-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: ["new-tag"] }),
    });

    const res = await PUT(req, makeParams("test-id-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tags[0].tag.name).toBe("new-tag");
    const { resolveTagConnections } = require("@/lib/tags");
    expect(resolveTagConnections).toHaveBeenCalledWith(["new-tag"], expect.anything());
  });

  it("only updates provided fields (partial update)", async () => {
    mockPrisma.item.findUnique.mockResolvedValue(sampleItem);
    mockPrisma.tagOnItem.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.item.update.mockResolvedValue({
      ...sampleItem,
      value: 99.99,
    });

    const req = makeRequest("http://localhost:3000/api/items/test-id-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: 99.99 }),
    });

    await PUT(req, makeParams("test-id-1"));

    const updateCall = mockPrisma.item.update.mock.calls[0][0];
    // name should not be in the data since it wasn't provided
    expect(updateCall.data.name).toBeUndefined();
    expect(updateCall.data.value).toBe(99.99);
  });
});

describe("DELETE /api/items/:id", () => {
  it("deletes an existing item", async () => {
    mockPrisma.item.findUnique.mockResolvedValue(sampleItem);
    mockPrisma.item.delete.mockResolvedValue(sampleItem);

    const req = makeRequest("http://localhost:3000/api/items/test-id-1", {
      method: "DELETE",
    });

    const res = await DELETE(req, makeParams("test-id-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.item.delete).toHaveBeenCalledWith({
      where: { id: "test-id-1" },
    });
  });

  it("returns 404 when deleting nonexistent item", async () => {
    mockPrisma.item.findUnique.mockResolvedValue(null);

    const req = makeRequest("http://localhost:3000/api/items/nonexistent", {
      method: "DELETE",
    });

    const res = await DELETE(req, makeParams("nonexistent"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Item not found");
    expect(mockPrisma.item.delete).not.toHaveBeenCalled();
  });

  it("cleans up photo file when item has a photo", async () => {
    const itemWithPhoto = { ...sampleItem, photo: "/uploads/test.jpg" };
    mockPrisma.item.findUnique.mockResolvedValue(itemWithPhoto);
    mockPrisma.item.delete.mockResolvedValue(itemWithPhoto);

    const req = makeRequest("http://localhost:3000/api/items/test-id-1", {
      method: "DELETE",
    });

    await DELETE(req, makeParams("test-id-1"));

    const fs = require("node:fs/promises");
    expect(fs.unlink).toHaveBeenCalled();
  });

  it("returns 403 when owner edits someone else's item", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-2",
        role: "owner",
      },
    });
    mockPrisma.item.findUnique.mockResolvedValue(sampleItem);

    const req = makeRequest("http://localhost:3000/api/items/test-id-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Item" }),
    });

    const res = await PUT(req, makeParams("test-id-1"));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });
});
