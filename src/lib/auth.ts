import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/permissions";

async function getUserRole(userId: string): Promise<Role> {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!existingUser) {
    return "viewer";
  }

  if (existingUser.role === "viewer") {
    const userCount = await prisma.user.count();
    if (userCount === 1) {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role: "admin" },
        select: { role: true },
      });
      return updatedUser.role as Role;
    }
  }

  return existingUser.role as Role;
}

const providers = [];

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  );
}

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      const userId = user?.id ?? token.sub;
      if (!userId) {
        return token;
      }

      token.sub = userId;
      token.role = await getUserRole(userId);

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as Role | undefined) ?? "viewer";
      }

      return session;
    },
  },
});
