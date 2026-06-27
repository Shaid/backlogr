import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Package, Plus } from "lucide-react";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Backlogr",
  description: "Catalog your belongings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border/50 sticky top-0 z-50 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                <Package className="w-4.5 h-4.5" />
              </div>
              Backlogr
            </Link>
            <Link href="/items/new">
              <Button size="sm" className="gap-1.5 font-medium">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Item</span>
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </main>
        <Toaster richColors />
      </body>
    </html>
  );
}
