import Hero from "~/app/components/hero";
import Footer from "~/components/layout/footer/footer";
import Link from "next/link";
import ActivityCard from "~/components/ui/small-activity-card";

const upcomingActivities = [
  {
    title: "Inndrikkning",
    meta: "Mandag 7. August, 2024 - Sted: Klubben",
    description: "Inndrikkning med de nye medlemmene",
    href: "/aktiviteter",
  },
  {
    title: "Jalla vors",
    meta: "Tirsdag 8. August, 2024 - Sted: Klubben",
    description: "Alle skal på jalla",
    href: "/aktiviteter",
  },
];

export default async function Home() {
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
        <div className="my-10 h-px w-full bg-border/60" />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Neste aktiviteter
          </h2>
          <Link
            href="/aktiviteter"
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            {"Se alle ->"}
          </Link>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {upcomingActivities.map((activity) => (
            <ActivityCard key={activity.title} {...activity} />
          ))}
        </div>
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </main>
  );
}
