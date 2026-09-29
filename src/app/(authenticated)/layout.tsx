import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type React from "react";
import { Suspense } from "react";
import { auth } from "~/server/auth/config";
import { hasAppAccess } from "~/server/fadder";
import AllergySync from "~/components/allergy-sync";
import BottomBarNav from "~/components/layout/bottom-bar";
import Footer from "~/components/layout/footer/footer";
import Header from "~/components/layout/header/header";
import VippsPaymentOverlay from "~/components/vipps-payment-overlay";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/registrering");
  }

  // No access yet: show the payment prompt INSTEAD of the app, not on top of
  // it. Rendering `children` here server-rendered the whole app behind the
  // overlay, so removing one element in devtools was enough to read everything
  // without paying. Faddere and admins owe nothing and never reach this branch.
  return (
    <SiteShell>
      {hasAppAccess(session.user) ? children : <VippsPaymentOverlay />}
      <AllergySync />
    </SiteShell>
  );
}

/**
 * Header, footer og bunnlinje rundt appen — samme ramme som Kvark sin
 * `_app`-layout. Bunnpaddingen holder footeren klar av den faste bunnlinja,
 * som bare finnes under lg.
 */
function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
      <Suspense fallback={null}>
        <BottomBarNav />
      </Suspense>
    </div>
  );
}
