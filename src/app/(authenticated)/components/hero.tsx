import { CalendarDays, Info, Users } from "lucide-react";
import Link from "next/link";
import { Card } from "~/components/ui/card";

const quickActions = [
  {
    title: "Informasjon",
    href: "/informasjon",
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
];

export default function Hero() {
  return (
    <section className="relative w-full pt-6">
      <div className="max-w-page mx-auto w-full px-4 pt-6 pb-8 md:px-6">
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-transparent sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text dark:from-sky-300 dark:to-blue-400">
                Velkommen til fadderuka 2026!
              </span>
            </h1>
            <p className="text-muted-foreground max-w-xl text-sm leading-relaxed sm:text-base">
              Fadderuka er to uker med aktiviteter som gir deg muligheten til å
              bli bedre kjent med de i klassen din!
            </p>
            <p className="text-muted-foreground max-w-xl text-sm leading-relaxed sm:text-base">
              Her finner du blant annet informasjon om aktiviteter i fadderuka
              og hvilken faddergruppe du er i. Vi gleder oss til å se deg!
            </p>
          </div>

          <div className="flex flex-col items-end gap-6">
            <div className="grid w-full max-w-sm grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Card key={action.title} asChild>
                    <Link
                      href={action.href}
                      className="group text-foreground flex w-full items-center gap-3 rounded-xl border border-[color:var(--action-border)] bg-[color:var(--action-bg)] px-4 py-3 text-sm font-semibold shadow-[0_0_0_1px_var(--surface-border)] transition hover:border-[color:var(--surface-border-strong)] hover:bg-[color:var(--surface-strong)]"
                    >
                      <span className="text-foreground group-hover:bg-primary/10 grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--surface-soft)] transition">
                        <Icon className="h-4 w-4" />
                      </span>
                      {action.title}
                    </Link>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
