"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import ActivityModal, { type ModalActivity } from "~/components/ui/activity-modal";
import { ActivityImage } from "~/components/ui/activity-image";
import { stripMarkdown } from "~/lib/utils";

export default function AktiviteterList({
  days,
}: {
  days: [string, ModalActivity[]][];
}) {
  const [selected, setSelected] = useState<ModalActivity | null>(null);

  return (
    <>
      <div className="flex flex-col gap-10">
        {days.map(([dateKey, dayActivities]) => {
          const date = new Date(dateKey);
          const label = date.toLocaleDateString("no-NO", { weekday: "long" });
          const dateStr = date.toLocaleDateString("no-NO", {
            day: "numeric",
            month: "long",
          });

          return (
            // Dagoverskriften er en h2 og skal ligge under sidens h1
            // (text-3xl/4xl). Den var før text-5xl — større enn tittelen.
            <section key={dateKey} className="flex flex-col gap-4">
              <div className="flex items-baseline gap-3">
                <h2 className="font-heading text-foreground text-2xl font-semibold capitalize tracking-tight">
                  {label}
                </h2>
                <span className="text-muted-foreground text-sm">{dateStr}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {dayActivities.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => setSelected(activity)}
                    data-slot="card"
                    className="ring-card-border flex flex-col gap-4 overflow-hidden rounded-xl bg-card p-4 text-left text-card-foreground ring-1"
                  >
                    <ActivityImage
                      src={activity.imageUrl}
                      alt={activity.title}
                      className="aspect-video w-full rounded-lg object-cover"
                    />
                    <div className="flex flex-col gap-2">
                      <h3 className="font-heading text-foreground text-base leading-snug font-medium">
                        {activity.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {new Date(activity.date).toLocaleTimeString("no-NO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-foreground/30" />
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {activity.location.startsWith("http")
                            ? "Vis på kart"
                            : activity.location}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 text-sm">
                        {stripMarkdown(activity.description)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <ActivityModal activity={selected} onClose={() => setSelected(null)} />
    </>
  );
}
