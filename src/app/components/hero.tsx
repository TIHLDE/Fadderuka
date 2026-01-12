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
    href: "#",
    icon: Users,
  },
  {
    title: "Drikkekleker",
    href: "#",
    icon: Beer,
  },
];

const currentYear = new Date().getFullYear();

export default function Hero() {
  return (
    <section className="relative w-full pt-6">
      <div className="mx-auto w-full max-w-page px-4 pb-8 pt-6 md:px-6">
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-transparent sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text dark:from-sky-300 dark:to-blue-400">
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
              className="inline-flex text-sm font-semibold text-primary transition hover:text-primary/80"
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
                    className="group flex items-center gap-3 rounded-xl border border-[color:var(--action-border)] bg-[color:var(--action-bg)] px-4 py-3 text-sm font-semibold text-foreground shadow-[0_0_0_1px_var(--surface-border)] transition hover:border-[color:var(--surface-border-strong)] hover:bg-[color:var(--surface-soft)]"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--surface-soft)] text-primary transition group-hover:bg-primary/10">
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
