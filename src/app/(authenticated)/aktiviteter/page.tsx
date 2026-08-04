import { PageHeader, PageShell } from "~/components/layout/page-shell";
import { Reveal } from "~/components/ui/motion";
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
    <PageShell>
      <Reveal>
        <PageHeader
          centered
          title="Aktiviteter"
          description="Her finner du en oversikt over kommende aktiviteter i fadderuka!"
        />
      </Reveal>

      {days.length > 0 ? (
        <AktiviteterList days={days} />
      ) : (
        <p className="text-muted-foreground text-center">
          Ingen aktiviteter planlagt ennå.
        </p>
      )}
    </PageShell>
  );
}
