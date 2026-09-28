import { PageHeader, PageShell } from "~/components/layout/page-shell";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "~/components/ui/empty";
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
      <PageHeader
        title="Aktiviteter"
        description="Her finner du en oversikt over kommende aktiviteter i fadderuka!"
      />

      {days.length > 0 ? (
        <AktiviteterList days={days} />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Ingen aktiviteter planlagt ennå</EmptyTitle>
            <EmptyDescription>
              Aktivitetene dukker opp her så snart de er lagt ut.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </PageShell>
  );
}
