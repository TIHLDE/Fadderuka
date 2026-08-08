import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Countdown from "~/app/(authenticated)/components/countdown";
import GruppeNotice from "~/app/(authenticated)/components/gruppe-notice";
import Hero from "~/app/(authenticated)/components/hero";
import HorizontalEventsList, {
  PLACEHOLDER_IMAGE,
} from "~/app/(authenticated)/components/horizontal-events-list";
import { Reveal } from "~/components/ui/motion";
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
    <div className="relative flex w-full flex-1 flex-col overflow-hidden">
      <Hero />

      <GruppeNotice />

      <div className="mt-auto flex flex-col gap-6 pb-8">
        {events[0] ? <Countdown activity={events[0]} /> : null}

        <Reveal className="container mx-auto flex w-full items-end justify-between px-4">
          <h2 className="font-heading text-foreground text-2xl font-semibold tracking-tight">
            Aktiviteter
          </h2>
          <Link
            href="/aktiviteter"
            className="group text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
          >
            Se alle
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
        <Reveal>
          <HorizontalEventsList events={events} />
        </Reveal>
      </div>
    </div>
  );
}
