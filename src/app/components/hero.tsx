import Link from "next/link";
import { Beer, CalendarDays, Info, Users } from "lucide-react";

const quickActions = [
  {
    title: "Informasjon",
    href: "#",
    icon: Info,
  },
  {
    title: "Aktiviteter",
    href: "/aktiviteter",
    icon: CalendarDays,
  },
  {
    title: "Faddergruppe",
    href: "/faddergruppe",
    icon: Users,
  },
  {
    title: "Drikkeleker",
    href: "/drikkeleker",
    icon: Beer,
  },
];1

const currentYear = new Date().getFullYear();

export default function Hero() {
  return (
    <section className="relative w-full pt-6">
      <div className="mx-auto w-full max-w-page px-4 pb-8 pt-6 md:px-6">
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              <span className="text-foreground dark:bg-gradient-to-r dark:from-sky-300 dark:to-blue-400 dark:bg-clip-text dark:text-transparent">
                Fadderuka
              </span>
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Fadderuka er to uker med aktiviteter som gir deg muligheten til å
              bli bedre kjent med de i klassen din!
            </p>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Her finner du blant annet informasjon om aktiviteter i fadderuka
              og hvilken faddergruppe du er i.
            </p>
            <Link
              className="inline-flex text-sm font-semibold text-foreground transition hover:text-foreground/70 dark:text-sky-200 dark:hover:text-sky-100"
              href="#"
            >
              Les mer om fadderuka her
            </Link>
          </div>

          <div className="flex flex-col items-end gap-6">
            <span className="text-5xl font-semibold tracking-tight text-foreground/10 sm:text-6xl md:text-7xl">
              {currentYear}
            </span>
            <div className="grid w-full max-w-sm grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.title}
                    href={action.href}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] transition hover:bg-accent dark:hover:border-[#3a4663] dark:hover:bg-[#162033]"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground/5 text-sky-500 transition group-hover:bg-sky-400/20 dark:text-sky-200">
                      <Icon className="h-4 w-4" />
                    </span>
                    {action.title}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
