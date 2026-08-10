import { headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";
import { auth } from "~/server/auth/config";
import { hasAppAccess } from "~/server/fadder";
import AllergySync from "~/components/allergy-sync";
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
  if (!hasAppAccess(session.user)) {
    return (
      <>
        <AllergySync />
        <VippsPaymentOverlay />
      </>
    );
  }

  return (
    <>
      {children}
      <AllergySync />
    </>
  );
}
