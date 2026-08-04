import BottomBarNav from "~/components/layout/bottom-bar";
import Footer from "~/components/layout/footer/footer";
import Header from "~/components/layout/header/header";
import { ThemeProvider } from "~/components/ui/theme-provider";
import { Toaster } from "~/components/ui/toaster";

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import React, { Suspense } from "react";
import { cn } from "~/lib/utils";
import { TRPCReactProvider } from "~/trpc/react";
import "./globals.css";

// `variable` eksponerer snittet som --font-sans, som er tokenet
// tailwind.config leser for både `font-sans` og `font-heading`. Uten det ville
// familienavnet next/font genererer ikke nå CSS-en.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Fadderuke",
  description: "Nettside for fadderbarn og faddere under fadderuken",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#030b1a" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no" suppressHydrationWarning>
      <body
        className={cn(
          inter.variable,
          "bg-background text-foreground font-sans flex min-h-screen flex-col",
          // Holder footeren klar av den faste bunnlinja, som bare finnes under md.
          "pb-16 md:pb-0",
        )}
        suppressHydrationWarning
      >
        <TRPCReactProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            storageKey="tihlde-theme"
            disableTransitionOnChange
          >
            <Header />
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />
            <Suspense fallback={null}>
              <BottomBarNav />
            </Suspense>
            <Toaster />
          </ThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
