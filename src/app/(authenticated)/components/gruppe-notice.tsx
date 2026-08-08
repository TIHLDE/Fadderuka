import { Users } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { Card } from "~/components/ui/card";
import { auth } from "~/server/auth/config";
import { db } from "~/server/db";
import {
  areGrupperPublished,
  canSeeGruppe,
  GRUPPE_WAIT_DESCRIPTION,
} from "~/server/gruppe-visibility";

/**
 * Fadderbarn som ikke har en gruppe å gå til lurer på om noe er galt med
 * påmeldingen deres. De fant bare ut av det ved å klikke seg inn på
 * /faddergruppe, så beskjeden ligger nå også på forsiden — der alle lander.
 *
 * Vises ikke til faddere og admins (de ser gruppene hele tiden), og forsvinner
 * av seg selv når gruppene publiseres og fadderbarnet har et medlemskap.
 */
export default async function GruppeNotice() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  // Faddere venter ikke på noe slipp, så beskjeden er ikke deres.
  if (!user || user.isAdmin || user.isFadder) return null;

  const membership = await db.fadderGruppeMember.findFirst({
    where: { userId: user.id },
    select: { role: true },
  });

  const published = await areGrupperPublished(db);
  if (
    membership &&
    canSeeGruppe({
      isAdmin: user.isAdmin,
      role: membership.role,
      published,
    })
  ) {
    return null;
  }

  return (
    <div className="container mx-auto w-full px-4 pt-2 pb-10">
      <Card className="flex-row items-start gap-4 px-5 py-5">
        <Users className="text-muted-foreground mt-0.5 size-5 shrink-0" />
        <div className="flex flex-col gap-1.5">
          <p className="text-foreground font-medium">
            Du har ikke fått faddergruppe enda
          </p>
          <p className="text-muted-foreground text-pretty">
            {GRUPPE_WAIT_DESCRIPTION} Da finner du den under{" "}
            <Link
              href="/faddergruppe"
              className="text-foreground underline underline-offset-4"
            >
              Min faddergruppe
            </Link>
            .
          </p>
        </div>
      </Card>
    </div>
  );
}
