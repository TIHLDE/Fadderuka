import Hero from "~/app/components/hero";
import Footer from "~/components/layout/footer/footer";
import Link from "next/link";
import ActivityCard from "~/app/components/activity-card";

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
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        backgroundColor: "#0b1020",
        backgroundImage:
          "radial-gradient(700px 420px at 20% 0%, rgba(59,130,246,0.18), transparent 60%), radial-gradient(700px 420px at 80% 20%, rgba(14,116,144,0.22), transparent 60%)",
      }}
    >
      <Hero />

      <div className="max-w-page mx-auto w-full px-4 pb-16 md:px-6">
        <div className="my-10 h-px w-full bg-white/10" />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            Neste aktiviteter
          </h2>
          <Link
            href="/aktiviteter"
            className="text-sm font-medium text-slate-400 transition hover:text-slate-200"
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

      <Footer />
    </main>
  );
}
