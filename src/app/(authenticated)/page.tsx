import { ArrowRight } from "lucide-react";
import Link from "next/link";

import Countdown from "~/app/(authenticated)/components/countdown";
import Hero from "~/app/(authenticated)/components/hero";
import { ActivityList } from "~/components/activity-list";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "~/components/ui/empty";
import { Reveal } from "~/components/ui/motion";
import { api } from "~/trpc/server";

/** Seks aktiviteter, fordelt på to spalter — som på tihlde.org. */
const ACTIVITIES_PREVIEW_COUNT = 6;

export default async function Home() {
  const activities = await api.activity.getUpcoming();
  const now = new Date();
  const upcoming = activities
    .filter((activity) => new Date(activity.date) >= now)
    .slice(0, ACTIVITIES_PREVIEW_COUNT);

  return (
    <>
      <Hero>{upcoming[0] ? <Countdown activity={upcoming[0]} /> : null}</Hero>

      <section className="container mx-auto flex w-full flex-col gap-4 px-4 py-8">
        {/* `className` direkte på Reveal: se kommentaren i PageHeader. */}
        <Reveal className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="min-w-0 text-2xl">Aktiviteter</h2>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/aktiviteter" />}
          >
            Se alle
            <ArrowRight />
          </Button>
        </Reveal>

        {upcoming.length > 0 ? (
          <ActivityList activities={upcoming} showDay />
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Ingen kommende aktiviteter</EmptyTitle>
              <EmptyDescription>
                Aktivitetene dukker opp her så snart de er lagt ut.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </>
  );
}
