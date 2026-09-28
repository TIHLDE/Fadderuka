import { ActivityList } from "~/components/activity-list";
import type { ModalActivity } from "~/components/ui/activity-modal";

export default function AktiviteterList({
  days,
}: {
  days: [string, ModalActivity[]][];
}) {
  return (
    <div className="flex flex-col gap-10">
      {days.map(([dateKey, dayActivities]) => {
        const date = new Date(dateKey);
        const weekday = date.toLocaleDateString("no-NO", { weekday: "long" });
        const dateStr = date.toLocaleDateString("no-NO", {
          day: "numeric",
          month: "long",
        });

        return (
          <section key={dateKey} className="flex flex-col gap-4">
            <div className="flex items-baseline gap-3">
              <h2 className="text-2xl capitalize">{weekday}</h2>
              <span className="text-muted-foreground text-sm">{dateStr}</span>
            </div>
            <ActivityList activities={dayActivities} />
          </section>
        );
      })}
    </div>
  );
}
