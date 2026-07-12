"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import ActivityModal, { type ModalActivity } from "~/components/ui/activity-modal";

export default function AktiviteterList({
  days,
}: {
  days: [string, ModalActivity[]][];
}) {
  const [selected, setSelected] = useState<ModalActivity | null>(null);

  return (
    <>
      <div className="mt-16 space-y-16">
        {days.map(([dateKey, dayActivities]) => {
          const date = new Date(dateKey);
          const label = date.toLocaleDateString("no-NO", { weekday: "long" });
          const dateStr = date.toLocaleDateString("no-NO", {
            day: "numeric",
            month: "long",
          });

          return (
            <section key={dateKey} className="space-y-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-6">
                <h2 className="text-3xl font-bold capitalize text-foreground sm:text-4xl md:text-5xl">
                  {label}
                </h2>
                <span className="text-sm text-muted-foreground sm:text-base md:text-xl">
                  {dateStr}
                </span>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {dayActivities.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => setSelected(activity)}
                    className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-strong)] p-6 text-left shadow-[0_0_0_1px_var(--surface-border)] backdrop-blur transition hover:border-[color:var(--surface-border-strong)]"
                  >
                    {activity.imageUrl ? (
                      <img
                        src={activity.imageUrl}
                        alt={activity.title}
                        className="h-44 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-44 w-full items-center justify-center rounded-lg bg-gradient-to-br from-slate-900 via-sky-900/70 to-slate-800">
                        <span className="text-2xl font-extrabold tracking-wide text-white">
                          {activity.title}
                        </span>
                      </div>
                    )}
                    <div className="mt-6 space-y-3">
                      <h3 className="text-2xl font-semibold text-foreground">
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
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {activity.description}
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
