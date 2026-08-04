import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader, PageShell } from "~/components/layout/page-shell";
import { Card } from "~/components/ui/card";
import { auth } from "~/server/auth/config";
import { db } from "~/server/db";
import { GroupView } from "./group-view";

export default async function FaddergroupPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/registrering");
  }

  // Admins see the admin panel instead
  if (session.user.isAdmin) {
    redirect("/admin");
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
      <PageShell className="flex-1 items-center justify-center">
        <PageHeader
          centered
          className="max-w-md"
          title="Ingen faddergruppe"
          description="Du er ikke tildelt en faddergruppe enda. Kontakt en administrator for å bli lagt til i en gruppe."
        />
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
        <h2 className="font-heading text-foreground text-2xl font-semibold tracking-tight">
          Medlemmer
        </h2>
        <Card className="grid gap-6 p-4 md:grid-cols-2 md:gap-8">
          <div className="flex flex-col gap-3">
            <h3 className="text-foreground text-sm font-semibold">
              Fadderbarn
            </h3>
            <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
              {fadderbarn.map((member) => (
                <li key={member.id}>{member.user.name}</li>
              ))}
              {fadderbarn.length === 0 && <li>Ingen fadderbarn enda</li>}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-foreground text-sm font-semibold">Faddere</h3>
            <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
              {faddere.map((member) => (
                <li key={member.id}>{member.user.name}</li>
              ))}
              {faddere.length === 0 && <li>Ingen faddere enda</li>}
            </ul>
          </div>
        </Card>
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
