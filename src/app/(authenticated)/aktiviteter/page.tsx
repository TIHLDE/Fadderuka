import Footer from "~/components/layout/footer/footer";
import { api } from "~/trpc/server";
import { MapPin } from "lucide-react";

export default async function AktiviteterPage() {
  const activities = await api.activity.getAll();

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
      <div className="pointer-events-none absolute -left-40 -top-32 h-[520px] w-[520px] rounded-full bg-sky-400/10 blur-[140px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[10%] h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[10%] left-[20%] h-[420px] w-[420px] rounded-full bg-slate-500/10 blur-[140px]" />

      <div className="mx-auto w-full max-w-page px-4 pb-24 pt-24 md:px-6">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl md:text-7xl">
            Aktiviteter
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Her finner du en oversikt over kommende aktiviteter.
          </p>
        </div>

        {days.length > 0 ? (
          <div className="mt-16 space-y-16">
            {days.map(([dateKey, dayActivities]) => {
              const date = new Date(dateKey);
              const label = date.toLocaleDateString("no-NO", { weekday: "long" });
              const dateStr = date.toLocaleDateString("no-NO", { day: "numeric", month: "long" });

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
                      <div
                        key={activity.id}
                        className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-strong)] p-6 shadow-[0_0_0_1px_var(--surface-border)] backdrop-blur"
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
                              {activity.location.startsWith("http") ? (
                                <a
                                  href={activity.location}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary/80 transition"
                                >
                                  Vis på kart
                                </a>
                              ) : (
                                activity.location
                              )}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{activity.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <p className="mt-16 text-center text-muted-foreground">
            Ingen aktiviteter planlagt ennå.
          </p>
        )}
      </div>

      <Footer />
    </main>
  );
}
