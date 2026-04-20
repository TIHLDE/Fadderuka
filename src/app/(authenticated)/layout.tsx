import React from "react";
import { auth } from "~/server/auth/config";
import VippsPaymentOverlay from "~/components/vipps-payment-overlay";

export default function AuthenticatedLayout({
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

  if (!session.user.isVerified) {
    return (
      <>
        {children}
        <VippsPaymentOverlay />
      </>
    );
  }

  return <>{children}</>;
}
