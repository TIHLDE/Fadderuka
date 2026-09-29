import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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

  if (!stored) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lenka virker ikke</CardTitle>
          <CardDescription>
            Lenker varer i én time og kan bare brukes én gang. Denne er enten
            brukt opp, utløpt eller erstattet av en nyere.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" render={<Link href="/glemt-passord" />}>
            Be om en ny lenke
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Velg nytt passord</CardTitle>
        <CardDescription>
          Du setter nytt passord for{" "}
          <span className="text-foreground font-medium">
            {stored.user.tihldeUserId}
          </span>
          . Passordet gjelder bare denne siden — passordet ditt på tihlde.org
          endres ikke.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <NyttPassordForm token={token} />
      </CardContent>
    </Card>
  );
}
