import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Footer from "~/components/layout/footer/footer";
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
      <main
        className="relative flex min-h-screen w-full flex-1 flex-col overflow-hidden text-white"
        style={{
          backgroundColor: "var(--page-bg)",
          backgroundImage: "var(--page-bg-image), var(--page-gradient)",
        }}
      >
        <div className="pointer-events-none absolute top-[-280px] left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(100,149,230,0.35),transparent_70%)] blur-3xl" />
        <div className="max-w-page relative mx-auto flex w-full flex-1 flex-col items-center justify-center !px-4 !pt-24 !pb-16 md:!px-6">
          <div className="mx-auto max-w-md !space-y-4 text-center">
            <h1 className="text-3xl font-bold text-white">
              Ingen faddergruppe
            </h1>
            <p className="text-[#8694b4]">
              Du er ikke tildelt en faddergruppe enda. Kontakt en administrator
              for a bli lagt til i en gruppe.
            </p>
          </div>
        </div>
        <div className="mt-auto w-full">
          <Footer />
        </div>
      </main>
    );
  }

  const gruppe = membership.gruppe;
  const faddere = gruppe.members.filter((m) => m.role === "FADDER");
  const fadderbarn = gruppe.members.filter((m) => m.role === "FADDERBARN");
  const canPost = membership.role === "FADDER";

  return (
    <main
      className="relative flex min-h-screen w-full flex-1 flex-col overflow-hidden text-white"
      style={{
        backgroundColor: "var(--page-bg)",
        backgroundImage: "var(--page-bg-image), var(--page-gradient)",
      }}
    >
      <div className="pointer-events-none absolute top-[-280px] left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(100,149,230,0.35),transparent_70%)] blur-3xl" />
      <div className="pointer-events-none absolute top-[180px] right-[-260px] h-[460px] w-[620px] rotate-[-20deg] rounded-[45%] bg-[radial-gradient(circle,rgba(144,223,237,0.28),transparent_72%)] blur-3xl" />
      <div className="pointer-events-none absolute top-[360px] left-[-320px] h-[520px] w-[760px] rotate-12 rounded-[50%] bg-[radial-gradient(circle,rgba(73,120,179,0.22),transparent_70%)] blur-[120px]" />

      <div className="max-w-page relative mx-auto flex w-full flex-1 flex-col !px-4 !pt-24 !pb-16 md:!px-6">
        <div className="mx-auto flex w-full max-w-[1040px] flex-col !gap-12">
          <section className="!space-y-5">
            <h1 className="bg-gradient-to-r from-[#90dfed] to-[#6495e6] bg-clip-text text-4xl leading-[1.15] font-bold text-transparent md:text-5xl">
              {gruppe.name}
            </h1>
            <p className="max-w-3xl text-base text-[#8694b4] sm:text-lg">
              Velkommen til {gruppe.name}! Her finner du en oversikt over alle
              faddere og fadderbarn i tillegg til informasjon fra fadderne til
              faddergruppa.
            </p>
          </section>

          <section className="!space-y-6">
            <h2 className="text-3xl font-extrabold tracking-[-0.02em] text-white sm:text-[36px]">
              Medlemmer
            </h2>
            <div className="grid !gap-10 rounded-xl border border-[#73aac4]/70 bg-[color:var(--surface-soft)] !p-6 shadow-[0_24px_60px_rgba(4,10,23,0.35)] backdrop-blur md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:!gap-16">
              <div className="!space-y-4">
                <h3 className="text-lg font-semibold text-white">Fadderbarn</h3>
                <ul className="!space-y-2 text-sm text-[#7f8fb2] sm:text-base">
                  {fadderbarn.map((member) => (
                    <li key={member.id}>{member.user.name}</li>
                  ))}
                  {fadderbarn.length === 0 && (
                    <li className="text-[#5b6a8f]">Ingen fadderbarn enda</li>
                  )}
                </ul>
              </div>
              <div className="!space-y-4">
                <h3 className="text-lg font-semibold text-white">Faddere</h3>
                <div className="grid !gap-2 text-sm text-[#7f8fb2] sm:text-base">
                  {faddere.map((member) => (
                    <div key={member.id}>
                      <span>{member.user.name}</span>
                    </div>
                  ))}
                  {faddere.length === 0 && (
                    <span className="text-[#5b6a8f]">Ingen faddere enda</span>
                  )}
                </div>
              </div>
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
                ? "Ingen meldinger enda. Skriv den forste meldingen til gruppa!"
                : "Ingen meldinger enda."
            }
          />

          <GroupView
            gruppeId={gruppe.id}
            canPost
            currentUserName={session.user.name}
            channel="CHAT"
            title={`${gruppe.name} chat`}
            composerTitle="Nytt sporsmal"
            composerSubtitle="Still et sporsmal til resten av faddergruppa."
            composerPlaceholder="Hva lurer du pa?"
            emptyMessage="Ingen sporsmal enda. Vaer den forste til a spore!"
          />
        </div>
      </div>

      <div className="mt-auto w-full">
        <Footer />
      </div>
    </main>
  );
}
