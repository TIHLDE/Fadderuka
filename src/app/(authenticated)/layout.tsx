import { headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";
import { auth } from "~/server/auth/config";

/* export default async function AuthenticatedLayout({
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
      <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <div className="mx-auto max-w-md space-y-4">
          <h1 className="text-foreground text-3xl font-bold">
            Kontoen din er ikke verifisert
          </h1>
          <p className="text-muted-foreground">
            Du må bli verifisert av en administrator før du kan bruke systemet.
            Ta kontakt med en fadder eller administrator for å bli verifisert.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
*/
