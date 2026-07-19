import Footer from "~/components/layout/footer/footer";
import { Reveal } from "~/components/ui/reveal";
import { api } from "~/trpc/server";
import AktiviteterList from "./aktiviteter-list";

export default async function AktiviteterPage() {
  const activities = await api.activity.getUpcoming();

  // Group activities by calendar day
  const grouped = activities.reduce<Record<string, typeof activities>>(
    (acc, activity) => {
      const key = new Date(activity.date).toDateString();
      acc[key] ??= [];
      acc[key].push(activity);
      return acc;
    },
    {},
  );

  const days = Object.entries(grouped);

  return (
    <main
      className="relative min-h-screen w-full overflow-hidden pt-4"
      style={{
        backgroundColor: "var(--page-bg)",
        backgroundImage: "var(--page-gradient)",
      }}
    >

      <div className="max-w-page mx-auto w-full px-4 pt-24 pb-24 md:px-6">
        <Reveal className="flex flex-col items-center gap-4 text-center">
          <h1 className="font-heading text-foreground text-4xl font-semibold tracking-tight sm:text-6xl md:text-7xl">
            Aktiviteter
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-base text-pretty sm:text-lg">
            Her finner du en oversikt over kommende aktiviteter i fadderuka!
          </p>
        </Reveal>

        {days.length > 0 ? (
          <AktiviteterList days={days} />
        ) : (
          <p className="text-muted-foreground mt-16 text-center">
            Ingen aktiviteter planlagt ennå.
          </p>
        )}
      </div>

      <Footer />
    </main>
  );
}
