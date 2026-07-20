import { headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";
import { auth, needsLocalPassword } from "~/server/auth/config";
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

  // Accounts that would be locked out the moment this session expires get one
  // blocking stop: choose a password while we can still tell who they are.
  if (needsLocalPassword(session)) {
    redirect("/velg-passord");
  }

  if (!session.user.isVerified) {
    return (
      <>
        {children}
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
