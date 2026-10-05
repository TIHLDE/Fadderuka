import { ThemeProvider } from "~/components/ui/theme-provider";
import { Toaster } from "~/components/ui/sonner";

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type React from "react";
import { cn } from "~/lib/utils";
import { TRPCReactProvider } from "~/trpc/react";
import "./globals.css";

// `variable` eksponerer snittet som --font-inter, som `@theme inline` i
// globals.css bygger både `font-sans` og `font-heading` på. Uten det ville
// familienavnet next/font genererer ikke nå CSS-en.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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
          "bg-background text-foreground font-sans",
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
            {children}
            <Toaster />
          </ThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
