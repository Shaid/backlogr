// Mock Prisma before any imports
const mockPrisma = {
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
};

jest.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

import { GET, POST } from "@/app/api/items/route";
import { NextRequest } from "next/server";

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
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
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
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
});

describe("GET /api/items", () => {
  it("returns all items when no query", async () => {
    mockPrisma.item.findMany.mockResolvedValue([sampleItem]);

    const req = makeRequest("http://localhost:3000/api/items");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Test Item");
    expect(mockPrisma.item.findMany).toHaveBeenCalledWith({
      include: { tags: { include: { tag: true } } },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("filters items when query param is provided", async () => {
    mockPrisma.item.findMany.mockResolvedValue([sampleItem]);

    const req = makeRequest("http://localhost:3000/api/items?q=Test");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);

    const call = mockPrisma.item.findMany.mock.calls[0][0];
    expect(call.where).toBeDefined();
    expect(call.where.OR).toBeDefined();
    expect(call.where.OR).toHaveLength(6);
  });

  it("returns empty array when no items match", async () => {
    mockPrisma.item.findMany.mockResolvedValue([]);

    const req = makeRequest("http://localhost:3000/api/items?q=nonexistent");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([]);
  });
});

describe("POST /api/items", () => {
  it("creates an item with minimal fields", async () => {
    mockPrisma.item.create.mockResolvedValue({
      ...sampleItem,
      tags: [],
    });

    const req = makeRequest("http://localhost:3000/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Item" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.name).toBe("Test Item");
    expect(mockPrisma.item.create).toHaveBeenCalledTimes(1);
  });

  it("creates an item with all fields", async () => {
    mockPrisma.tag.upsert.mockResolvedValue({ id: "tag-1", name: "gadget" });
    mockPrisma.item.create.mockResolvedValue(sampleItem);

    const req = makeRequest("http://localhost:3000/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Item",
        description: "A test item",
        category: "Electronics",
        quantity: 1,
        value: 29.99,
        condition: "New",
        barcode: "1234567890",
        location: "Office",
        tags: ["gadget"],
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.tags).toHaveLength(1);
    expect(mockPrisma.tag.upsert).toHaveBeenCalledWith({
      where: { name: "gadget" },
      update: {},
      create: { name: "gadget" },
    });
  });

  it("returns 400 when name is missing", async () => {
    const req = makeRequest("http://localhost:3000/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "Books" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("name is required");
  });

  it("returns 400 when name is empty string", async () => {
    const req = makeRequest("http://localhost:3000/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("sets enrichStatus to pending when barcode is provided", async () => {
    mockPrisma.item.create.mockResolvedValue({
      ...sampleItem,
      enrichStatus: "pending",
    });

    const req = makeRequest("http://localhost:3000/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Book", barcode: "9780134685991" }),
    });

    await POST(req);

    const createCall = mockPrisma.item.create.mock.calls[0][0];
    expect(createCall.data.enrichStatus).toBe("pending");
  });

  it("handles tags with whitespace and empty strings", async () => {
    mockPrisma.tag.upsert.mockResolvedValue({ id: "tag-1", name: "clean" });
    mockPrisma.item.create.mockResolvedValue({ ...sampleItem, tags: [] });

    const req = makeRequest("http://localhost:3000/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test",
        tags: ["  clean  ", "", "  "],
      }),
    });

    await POST(req);

    // Only "clean" should be upserted (empty strings filtered out)
    expect(mockPrisma.tag.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.tag.upsert).toHaveBeenCalledWith({
      where: { name: "clean" },
      update: {},
      create: { name: "clean" },
    });
  });
});
