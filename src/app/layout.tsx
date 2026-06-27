import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { DM_Mono, DM_Sans } from "next/font/google";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { auth } from "@/lib/auth";
import { canPerform } from "@/lib/permissions";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Backlogr",
  description: "Catalog your belongings",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const showCreateButton = Boolean(
    session?.user && canPerform(session.user.role, "create", undefined, session.user.id),
  );

  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable} dark h-full antialiased`}>
      <body className="min-h-full">
        <AuthSessionProvider session={session}>
          <TooltipProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex-1" />
                  {showCreateButton && (
                    <Button
                      render={<Link href="/items/new" />}
                      size="sm"
                      className="gap-1.5 font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Add Item</span>
                    </Button>
                  )}
                </header>
                <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
        </AuthSessionProvider>
        <Toaster richColors />
      </body>
    </html>
  );
}
