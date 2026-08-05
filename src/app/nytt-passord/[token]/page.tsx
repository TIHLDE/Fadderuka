import Link from "next/link";
import { Card, CardDescription, CardTitle } from "~/components/ui/card";
import { consumableToken } from "~/server/auth/password-reset";

import { NyttPassordForm } from "./nytt-passord-form";

/**
 * The page a reset link lands on. The token is checked here so a dead link says
 * so immediately instead of after the user has typed a password twice — it is
 * checked again on submit, since anything can happen in between.
 */
export default async function NyttPassordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const stored = await consumableToken(token);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl">
        <Card>
          <div className="flex flex-col gap-6 p-8 sm:p-12">
            {stored ? (
              <>
                <div className="flex flex-col gap-2">
                  <CardTitle className="text-3xl font-bold">
                    Velg nytt passord
                  </CardTitle>
                  <CardDescription>
                    Du setter nytt passord for{" "}
                    <span className="text-foreground font-semibold">
                      {stored.user.tihldeUserId}
                    </span>
                    . Passordet gjelder bare denne siden — passordet ditt på
                    tihlde.org endres ikke.
                  </CardDescription>
                </div>
                <NyttPassordForm token={token} />
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <CardTitle className="text-3xl font-bold">
                    Lenka virker ikke
                  </CardTitle>
                  <CardDescription>
                    Lenker varer i én time og kan bare brukes én gang. Denne er
                    enten brukt opp, utløpt eller erstattet av en nyere.
                  </CardDescription>
                </div>
                <Link href="/glemt-passord" className="text-sm underline">
                  Be om en ny lenke
                </Link>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
