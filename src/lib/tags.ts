import { prisma } from "@/lib/db";

type TagClient = { tag: { upsert: typeof prisma.tag.upsert } };

/**
 * Resolve an array of tag names into tag connection objects for Prisma create.
 * Creates tags that don't exist yet via upsert.
 * Accepts optional client parameter for use inside transactions.
 */
export async function resolveTagConnections(
  tagNames?: string[],
  client: TagClient = prisma,
): Promise<{ tagId: string }[]> {
  if (!tagNames || !Array.isArray(tagNames)) return [];
  return Promise.all(
    tagNames
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter(Boolean)
      .map(async (name) => {
        const tag = await client.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        return { tagId: tag.id };
      }),
  );
}
