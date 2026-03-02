import Link from "next/link";
import Hero from "~/app/components/hero";
import Footer from "~/components/layout/footer/footer";
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
        <div className="bg-border/60 my-10 h-px w-full" />

        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-lg font-semibold">
            Neste aktiviteter
          </h2>
          <Link
            href="/aktiviteter"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition"
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
