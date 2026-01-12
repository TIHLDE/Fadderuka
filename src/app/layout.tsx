import Header from "~/components/layout/header/header";
import { ThemeProvider } from "~/components/ui/theme-provider";
import { Toaster } from "~/components/ui/toaster";

import "./globals.css";
import { cn } from "~/lib/utils";
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { Inter } from "next/font/google";
import React from "react";
import { TRPCReactProvider } from "~/trpc/react";

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
          "flex min-h-screen flex-col bg-[color:var(--page-bg)] text-foreground",
        )}
        suppressHydrationWarning
      >
          <SessionProvider>
            <TRPCReactProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
                disableTransitionOnChange
              >
                <Header className="hidden lg:flex" />
                {children}
                <Toaster />
              </ThemeProvider>
            </TRPCReactProvider>
          </SessionProvider>
      </body>
    </html>
  );
}
