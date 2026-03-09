import Header from "~/components/layout/header/header";
import { ThemeProvider } from "~/components/ui/theme-provider";
import { Toaster } from "~/components/ui/toaster";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import React from "react";
import { cn } from "~/lib/utils";
import { TRPCReactProvider } from "~/trpc/react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fadderuke",
  description: "Nettside for fadderbarn og faddere under fadderuken",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          inter.className,
          "text-foreground flex min-h-screen flex-col bg-[color:var(--page-bg)]",
        )}
        suppressHydrationWarning
      >
        <TRPCReactProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            storageKey="tihlde-theme"
            disableTransitionOnChange
          >
            <Header className="hidden lg:flex" />
            {children}
            <Toaster />
          </ThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
