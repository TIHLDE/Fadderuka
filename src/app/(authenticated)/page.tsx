import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Countdown from "~/app/(authenticated)/components/countdown";
import Hero from "~/app/(authenticated)/components/hero";
import HorizontalEventsList, {
  PLACEHOLDER_IMAGE,
} from "~/app/(authenticated)/components/horizontal-events-list";
import Footer from "~/components/layout/footer/footer";
import { Reveal } from "~/components/ui/reveal";
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

        <Reveal className="max-w-page mx-auto flex w-full items-end justify-between px-4 pt-10 md:px-6">
          <h2 className="font-heading text-foreground text-2xl font-semibold tracking-tight">
            Aktiviteter
          </h2>
          <Link
            href="/aktiviteter"
            className="group text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
          >
            Se alle
            <ArrowRight className="size-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
        <Reveal delay={80}>
          <HorizontalEventsList events={events} />
        </Reveal>
        <Footer />
      </div>
    </main>
  );
}
