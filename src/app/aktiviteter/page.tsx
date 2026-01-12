import Footer from "~/components/layout/footer/footer";
import ActivityCard, {
  type ActivityCardProps,
} from "~/components/ui/activity-card";

type ActivitySection = {
  label: string;
  date: string;
  items: ActivityCardProps[];
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

export default function AktiviteterPage() {
  return (
    <main className="relative min-h-screen w-full pt-4 overflow-hidden bg-gradient-to-b from-[#0f172a] via-[#0f1420] via-[84%] to-[#101013]">
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
                  <ActivityCard key={activity.title} {...activity} />
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
