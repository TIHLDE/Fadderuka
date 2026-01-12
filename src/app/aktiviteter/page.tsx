import Link from "next/link";
import Footer from "~/components/layout/footer/footer";
import { cn } from "~/lib/utils";

type Activity = {
  title: string;
  date: string;
  location: string;
  description: string;
  imageTitle: string;
  imageSubtitle?: string;
  variant: "dark" | "light";
};

type ActivitySection = {
  label: string;
  date: string;
  items: Activity[];
};

const activitySections: ActivitySection[] = [
  {
    label: "I dag",
    date: "12. august",
    items: [
      {
        title: "Kosekveld",
        date: "Tirsdag 8. August 2024",
        location: "Sted: Gløshaugen",
        description: "Vors på tihlde kontoret",
        imageTitle: "TIHLDE",
        imageSubtitle: "Organisasjonsleddet konsiti har opptak!",
        variant: "dark",
      },
      {
        title: "Togafest",
        date: "Onsdag 9. August",
        location: "Moholt",
        description: "Hjelp Pythons ved å svare på en kjapp spørreundersøkelse!",
        imageTitle: "DRIFT HAR OPPTAK!",
        imageSubtitle: "SKY · NETTVERK · SOSIALT",
        variant: "light",
      },
    ],
  },
  {
    label: "I morgen",
    date: "13. august",
    items: [
      {
        title: "Kosekveld",
        date: "Tirsdag 8. August 2024",
        location: "Sted: Gløshaugen",
        description: "Vors på tihlde kontoret",
        imageTitle: "TIHLDE",
        imageSubtitle: "Organisasjonsleddet konsiti har opptak!",
        variant: "dark",
      },
    ],
  },
  {
    label: "Onsdag",
    date: "14. august",
    items: [
      {
        title: "Kosekveld",
        date: "Tirsdag 8. August 2024",
        location: "Sted: Gløshaugen",
        description: "Vors på tihlde kontoret",
        imageTitle: "TIHLDE",
        imageSubtitle: "Organisasjonsleddet konsiti har opptak!",
        variant: "dark",
      },
      {
        title: "Togafest",
        date: "Onsdag 9. August",
        location: "Moholt",
        description: "Hjelp Pythons ved å svare på en kjapp spørreundersøkelse!",
        imageTitle: "DRIFT HAR OPPTAK!",
        imageSubtitle: "SKY · NETTVERK · SOSIALT",
        variant: "light",
      },
    ],
  },
];

function ActivityImage({
  title,
  subtitle,
  variant,
}: {
  title: string;
  subtitle?: string;
  variant: Activity["variant"];
}) {
  const isLight = variant === "light";

  return (
    <div className="relative h-44 w-full overflow-hidden rounded-lg">
      <div
        className={cn(
          "absolute inset-0",
          isLight
            ? "bg-gradient-to-br from-white via-slate-100 to-sky-200"
            : "bg-gradient-to-br from-slate-900 via-sky-900/70 to-slate-800",
        )}
      />
      <div
        className={cn(
          "absolute inset-0",
          isLight
            ? "bg-[radial-gradient(circle_at_20%_20%,rgba(14,116,144,0.35),transparent_55%)]"
            : "bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.35),transparent_60%)]",
        )}
      />
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <span
          className={cn(
            "text-xl font-extrabold tracking-wide",
            isLight ? "text-slate-900" : "text-white",
          )}
        >
          {title}
        </span>
        {subtitle ? (
          <span
            className={cn(
              "mt-2 text-xs font-semibold uppercase tracking-[0.2em]",
              isLight ? "text-slate-600" : "text-slate-200",
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-[#0c1426]/80 !p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur">
      <ActivityImage
        title={activity.imageTitle}
        subtitle={activity.imageSubtitle}
        variant={activity.variant}
      />
      <div className="mt-6 space-y-3">
        <h3 className="text-2xl font-semibold text-white">{activity.title}</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
          <span>{activity.date}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          <span>{activity.location}</span>
        </div>
        <p className="text-sm text-slate-400">{activity.description}</p>
        <Link
          href="#"
          className="inline-flex items-center gap-2 text-sm font-semibold text-sky-200 transition hover:text-sky-100"
        >
          Les mer
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

export default function AktiviteterPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#0f172a] via-[#0f1420] via-[84%] to-[#101013]">
      <div className="pointer-events-none absolute -left-40 -top-32 h-[520px] w-[520px] rounded-full bg-sky-400/10 blur-[140px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[10%] h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[10%] left-[20%] h-[420px] w-[420px] rounded-full bg-slate-500/10 blur-[140px]" />

      <div className="mx-auto w-full max-w-page px-4 pb-24 pt-24 md:px-6">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-50 sm:text-6xl md:text-7xl">
            Aktiviteter
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400 sm:text-lg">
            Her finner du en oversikt over kommende aktiviteter.
          </p>
        </div>

        <div className="mt-16 space-y-16">
          {activitySections.map((section) => (
            <section key={section.label} className="space-y-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-6">
                <h2 className="text-3xl font-bold text-white sm:text-4xl md:text-5xl">
                  {section.label}
                </h2>
                <span className="text-sm text-slate-400 sm:text-base md:text-xl">
                  {section.date}
                </span>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {section.items.map((activity) => (
                  <ActivityCard key={activity.title} activity={activity} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}
