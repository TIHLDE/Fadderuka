import Hero from "~/app/components/hero";
import Footer from "~/components/layout/footer/footer";
import Link from "next/link";

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
            <div
              key={activity.title}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#101728] via-[#0f1628] to-[#0b1222] !p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(15,23,42,0.6)] transition hover:border-white/20 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_0_0_1px_rgba(30,41,59,0.8)]"
            >
              <h3 className="text-base font-semibold text-slate-100">
                {activity.title}
              </h3>
              <p className="mt-2 text-xs text-slate-400">{activity.meta}</p>
              <p className="mt-3 text-sm text-slate-300">
                {activity.description}
              </p>
              <Link
                href={activity.href}
                className="mt-4 inline-flex text-sm font-semibold text-sky-200 transition hover:text-sky-100"
              >
                {"Les mer ->"}
              </Link>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}
