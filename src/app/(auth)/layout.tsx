import Link from "next/link";
import type React from "react";
import { Suspense } from "react";

import BottomBarNav from "~/components/layout/bottom-bar";
import { TihldeLogo } from "~/components/ui/icons/tihlde";

/**
 * Innlogging, registrering, passord og Vipps-tilbakekoblingen — bygget som
 * Kvark sin `_auth`-layout: ingen header eller footer, bare logoen over en
 * smal kolonne. Bunnlinja er eneste vei ut på mobil, derav paddingen som
 * holder den unna skjemaet.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12 pb-28 lg:pb-12">
      <Link
        href="/"
        className="flex items-center"
        style={{ color: "var(--color-logo, currentColor)" }}
      >
        <TihldeLogo variant="full" className="h-10 w-auto" />
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <Suspense fallback={null}>
        <BottomBarNav />
      </Suspense>
    </div>
  );
}
