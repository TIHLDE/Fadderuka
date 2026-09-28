import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader, PageShell } from "~/components/layout/page-shell";
import { Clock, Users } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { auth } from "~/server/auth/config";
import { db } from "~/server/db";
import { areGrupperPublished, canSeeGruppe } from "~/server/gruppe-visibility";
import { GroupView } from "./group-view";

export default async function FaddergroupPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/registrering");
  }

  // Find the user's group membership
  const membership = await db.fadderGruppeMember.findFirst({
    where: { userId: session.user.id },
    include: {
      gruppe: {
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true } },
            },
            orderBy: { role: "asc" },
          },
        },
      },
    },
  });

  if (!membership) {
    return (
      <PageShell className="flex-1 justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>Ingen faddergruppe</EmptyTitle>
            <EmptyDescription>
              Du er ikke tildelt en faddergruppe enda. Kontakt en administrator
              for å bli lagt til i en gruppe.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </PageShell>
    );
  }

  // Fadderbarna får ikke se gruppa si før FadderKom publiserer alle gruppene.
  // Faddere ser sin hele tiden, så de rekker å bli kjent og skrive velkomst.
  const published = await areGrupperPublished(db);
  if (
    !canSeeGruppe({
      isAdmin: session.user.isAdmin,
      role: membership.role,
      published,
    })
  ) {
    return (
      <PageShell className="flex-1 justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Clock />
            </EmptyMedia>
            <EmptyTitle>Faddergruppene slippes snart</EmptyTitle>
            <EmptyDescription>
              Vi holder fortsatt gruppene hemmelige. Så snart de er klare finner
              du gruppa di, fadderne dine og resten av gjengen her.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </PageShell>
    );
  }

  const gruppe = membership.gruppe;
  const faddere = gruppe.members.filter((m) => m.role === "FADDER");
  const fadderbarn = gruppe.members.filter((m) => m.role === "FADDERBARN");
  const canPost = membership.role === "FADDER";

  return (
    <PageShell className="max-w-5xl">
      <PageHeader
        title={gruppe.name}
        description={`Velkommen til ${gruppe.name}! Her finner du en oversikt over alle faddere og fadderbarn i tillegg til informasjon fra fadderne til faddergruppa.`}
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Medlemmer</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <MemberCard
            title="Faddere"
            names={faddere.map((m) => ({ id: m.id, name: m.user.name }))}
            emptyText="Ingen faddere enda"
          />
          <MemberCard
            title="Fadderbarn"
            names={fadderbarn.map((m) => ({ id: m.id, name: m.user.name }))}
            emptyText="Ingen fadderbarn enda"
          />
        </div>
      </section>

      <GroupView
        gruppeId={gruppe.id}
        canPost={canPost}
        currentUserName={session.user.name}
        channel="ANNOUNCEMENT"
        title="Meldinger fra fadderne"
        composerTitle="Ny melding"
        composerSubtitle="Skriv en beskjed til faddergruppen."
        composerPlaceholder="Hva vil du si til gruppa?"
        emptyMessage={
          canPost
            ? "Ingen meldinger enda. Skriv den første meldingen til gruppa!"
            : "Ingen meldinger enda."
        }
      />

      <GroupView
        gruppeId={gruppe.id}
        canPost
        currentUserName={session.user.name}
        channel="CHAT"
        title={`${gruppe.name} chat`}
        composerTitle="Nytt spørsmål"
        composerSubtitle="Still et spørsmål til resten av faddergruppa."
        composerPlaceholder="Hva lurer du på?"
        emptyMessage="Ingen spørsmål enda. Vær den første til å spørre!"
      />
    </PageShell>
  );
}

function MemberCard({
  title,
  names,
  emptyText,
}: {
  title: string;
  names: { id: string; name: string }[];
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction>
          <Badge variant="secondary">{names.length}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {names.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {names.map((member) => (
              <li key={member.id}>{member.name}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">{emptyText}</p>
        )}
      </CardContent>
    </Card>
  );
}
