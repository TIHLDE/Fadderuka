import Link from "next/link";
import Countdown from "~/app/(authenticated)/components/countdown";
import Hero from "~/app/(authenticated)/components/hero";
import HorizontalEventsList, {
  PLACEHOLDER_IMAGE,
} from "~/app/(authenticated)/components/horizontal-events-list";
import Footer from "~/components/layout/footer/footer";
import { api } from "~/trpc/server";

export default async function Home() {
  const activities = await api.activity.getUpcoming();
  const upcoming = activities
    .filter((activity) => new Date(activity.date) >= new Date())
    .slice(0, 8);
  const events = upcoming.map((activity) => ({
    id: activity.id,
    title: activity.title,
    description: activity.description,
    location: activity.location,
    date: activity.date,
    imageUrl: activity.imageUrl ?? PLACEHOLDER_IMAGE,
    type: "Arr." as const,
  }));

  return (
    <main
      className="relative flex w-full flex-1 flex-col overflow-hidden"
      style={{
        backgroundColor: "var(--page-bg)",
        backgroundImage: "var(--page-bg-image)",
      }}
    >
      <Hero />

      <div className="mt-auto">
        {upcoming[0] ? (
          <Countdown title={upcoming[0].title} target={upcoming[0].date} />
        ) : null}

        <div className="max-w-page mx-auto flex w-full items-center justify-between px-4 pt-6 md:px-6">
          <h2 className="text-foreground text-lg font-semibold">Aktiviteter</h2>
          <Link
            href="/aktiviteter"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition"
          >
            {"Se alle ->"}
          </Link>
        </div>
        <HorizontalEventsList events={events} />
        <Footer />
      </div>
    </main>
  );
}
