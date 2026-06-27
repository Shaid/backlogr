import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { type Action, canPerform, type Role } from "@/lib/permissions";

export type AuthenticatedUser = {
  id: string;
  role: Role;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }
  return user;
}

export async function requirePermission(action: Action, itemOwnerId?: string | null) {
  const user = await requireCurrentUser();

  if (!canPerform(user.role, action, itemOwnerId ?? undefined, user.id)) {
    redirect("/");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireCurrentUser();

  if (!canPerform(user.role, "admin", undefined, user.id)) {
    redirect("/");
  }

  return user;
}

export async function authorizeApiRequest(action: Action, itemOwnerId?: string | null) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (!canPerform(user.role, action, itemOwnerId ?? undefined, user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return user;
}
