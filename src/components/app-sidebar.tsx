"use client";

import { Home, Loader2, LogIn, LogOut, Package, Plus, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { type Action, canPerform, type Role } from "@/lib/permissions";

const navItems: Array<{
  title: string;
  href: string;
  icon: typeof Home;
  action: Action;
}> = [
  { title: "All Items", href: "/", icon: Home, action: "read" },
  { title: "Add Item", href: "/items/new", icon: Plus, action: "create" },
  { title: "Admin", href: "/admin", icon: Settings, action: "admin" },
];

function getRoleLabel(role?: Role) {
  if (!role) {
    return "Signed out";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const user = session?.user;
  const allowedItems = navItems.filter((item) =>
    user ? canPerform(user.role, item.action, undefined, user.id) : false,
  );

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="p-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight transition-opacity hover:opacity-80 group-data-[collapsible=icon]:justify-center"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-4.5 w-4.5" />
          </div>
          <span className="group-data-[collapsible=icon]:hidden">Backlogr</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allowedItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="space-y-3 group-data-[collapsible=icon]:hidden">
          {status === "loading" ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading session...
            </div>
          ) : user ? (
            <>
              <div className="space-y-1 rounded-lg border border-border/60 bg-muted/40 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="size-4 text-primary" />
                  <span className="truncate">{user.name || user.email || "Signed in user"}</span>
                </div>
                {user.email && (
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                )}
                <p className="text-xs text-muted-foreground">Role: {getRoleLabel(user.role)}</p>
              </div>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => signOut({ redirectTo: "/auth/signin" })}
                    tooltip="Sign out"
                  >
                    <LogOut />
                    <span>Sign out</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </>
          ) : (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/auth/signin" />} tooltip="Sign in">
                  <LogIn />
                  <span>Sign in</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
