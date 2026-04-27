import Link from "next/link";
import Hero from "~/app/(authenticated)/components/hero";
import Footer from "~/components/layout/footer/footer";
import ActivityCard from "~/components/ui/small-activity-card";
import { api } from "~/trpc/server";

export default async function Home() {
  const activities = await api.activity.getAll();
  const upcoming = activities.slice(0, 2);

  return (
    <main
      className="relative flex w-full flex-1 flex-col overflow-hidden"
      style={{
        backgroundColor: "var(--page-bg)",
        backgroundImage: "var(--page-bg-image)",
      }}
    >
      <Hero />
      <div className="max-w-page mx-auto w-full px-4 pb-16 md:px-6">
        <div className="bg-border/60 my-10 h-px w-full" />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Neste aktiviteter</h2>
          <Link
            href="/aktiviteter"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition"
          >
            {"Se alle ->"}
          </Link>
        </div>

        {upcoming.length > 0 ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {upcoming.map((activity) => (
              <Link
                key={activity.id}
                href="/aktiviteter"
                className="group block focus:outline-none"
                aria-label={`Åpne aktivitet: ${activity.title}`}
              >
                <div className="relative">
                  <ActivityCard
                    title={activity.title}
                    meta={`${new Date(activity.date).toLocaleDateString("no-NO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${activity.location}`}
                    description={activity.description}
                    href="/aktiviteter"
                  />
                  <span className="absolute inset-0 rounded-xl" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            Ingen aktiviteter planlagt ennå.
          </p>
        )}
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </main>
  );
}
