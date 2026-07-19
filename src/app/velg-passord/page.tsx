import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Footer from "~/components/layout/footer/footer";
import { Card, CardDescription, CardTitle } from "~/components/ui/card";
import { auth, needsLocalPassword } from "~/server/auth/config";

import { VelgPassordForm } from "./velg-passord-form";

/**
 * One-off page for accounts that registered here before we stored a password
 * hash. They are logged in right now, but nothing could let them back in once
 * the session expires — so we ask them to pick a password while the live
 * session still proves who they are. Lives outside the (authenticated) group
 * so the layout's redirect here cannot loop.
 */
export default async function VelgPassordPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) redirect("/logg-inn");
  // Nothing to do for anyone else — don't strand them on a dead-end page.
  if (!needsLocalPassword(session)) redirect("/");

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        backgroundColor: "var(--page-bg)",
        backgroundImage: "var(--page-bg-image)",
      }}
    >
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          <Card>
            <div className="flex flex-col gap-6 p-8 sm:p-12">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-3xl font-bold">
                  Velg et passord
                </CardTitle>
                <CardDescription>
                  Brukeren din på tihlde.org venter fortsatt på godkjenning, og
                  fram til den er godkjent kan du ikke logge inn her med
                  TIHLDE-passordet ditt. Velg et passord du bruker her, så
                  kommer du inn igjen neste gang.
                </CardDescription>
                <CardDescription>
                  Du logger inn med brukernavnet ditt,{" "}
                  <span className="font-semibold text-foreground">
                    {session.user.tihldeUserId}
                  </span>
                  . Passordet gjelder bare denne siden — passordet ditt på
                  tihlde.org endres ikke.
                </CardDescription>
              </div>

              <VelgPassordForm />
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
