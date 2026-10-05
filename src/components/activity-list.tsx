"use client";

import { CalendarDays, MapPin } from "lucide-react";
import { useState } from "react";

import { ListCard } from "~/components/list-card";
import ActivityModal, {
  type ModalActivity,
} from "~/components/ui/activity-modal";
import { Stagger } from "~/components/ui/motion";
import { TIME_ZONE } from "~/lib/date";

/**
 * Aktiviteter som Kvark sine arrangementsrader: to spalter med ListCard, og
 * et klikk åpner detaljene i en dialog i stedet for en egen side.
 *
 * `showDay` tar med ukedagen i tidspunktet — forsida blander dager, mens
 * aktivitetssida allerede grupperer per dag.
 */
export function ActivityList({
  activities,
  showDay = false,
}: {
  activities: ModalActivity[];
  showDay?: boolean;
}) {
  const [selected, setSelected] = useState<ModalActivity | null>(null);

  return (
    <>
      <Stagger render={<ul className="grid gap-8 lg:grid-cols-2" />}>
        {activities.map((activity) => (
          <li key={activity.id}>
            <ListCard
              render={
                <button
                  type="button"
                  className="w-full"
                  onClick={() => setSelected(activity)}
                />
              }
              title={activity.title}
              imageUrl={activity.imageUrl}
              meta={[
                {
                  icon: CalendarDays,
                  text: formatWhen(new Date(activity.date), showDay),
                },
                {
                  icon: MapPin,
                  text: activity.location.startsWith("http")
                    ? "Vis på kart"
                    : activity.location,
                },
              ]}
            />
          </li>
        ))}
      </Stagger>

      <ActivityModal activity={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function formatWhen(date: Date, showDay: boolean) {
  const time = date.toLocaleTimeString("no-NO", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!showDay) return `kl. ${time}`;

  const day = date.toLocaleDateString("no-NO", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} kl. ${time}`;
}
