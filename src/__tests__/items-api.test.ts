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

jest.mock("@/lib/actions", () => ({
  triggerEnrichment: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/tags", () => ({
  resolveTagConnections: jest.fn().mockResolvedValue([]),
}));

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/items/route";

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), init as never);
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
      include: {
        tags: { include: { tag: true } },
        images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      },
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
    expect(mockPrisma.item.create.mock.calls[0][0].data.userId).toBe("user-1");
  });

  it("creates an item with all fields", async () => {
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
    // resolveTagConnections is mocked — verify it was called with the tags
    const { resolveTagConnections } = require("@/lib/tags");
    expect(resolveTagConnections).toHaveBeenCalledWith(["gadget"]);
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

    // resolveTagConnections receives the raw array — it handles trimming internally
    const { resolveTagConnections } = require("@/lib/tags");
    expect(resolveTagConnections).toHaveBeenCalledWith(["  clean  ", "", "  "]);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = makeRequest("http://localhost:3000/api/items");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Authentication required");
  });
});
