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
    href: "#",
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

export default function Hero() {
  return (
    <section className="relative w-full pt-6">
      <div className="mx-auto w-full max-w-page px-4 pb-8 pt-6 md:px-6">
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-transparent sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-r from-sky-300 to-blue-400 bg-clip-text">
                Fadderuka
              </span>
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Fadderuka er to uker med aktiviteter som gir deg muligheten til å
              bli bedre kjent med de i klassen din!
            </p>
            <p className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Her finner du blant annet informasjon om aktiviteter i fadderuka
              og hvilken faddergruppe du er i.
            </p>
            <Link
              className="inline-flex text-sm font-semibold text-sky-200 transition hover:text-sky-100"
              href="#"
            >
              Les mer om fadderuka her
            </Link>
          </div>

          <div className="flex flex-col items-end gap-6">
            <span className="text-5xl font-semibold tracking-tight text-white/10 sm:text-6xl md:text-7xl">
              2025
            </span>
            <div className="grid w-full max-w-sm grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.title}
                    href={action.href}
                    className="group flex items-center gap-3 rounded-xl border border-[#2a3347] bg-[#111827] px-4 py-3 text-sm font-semibold text-slate-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] transition hover:border-[#3a4663] hover:bg-[#162033]"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-sky-200 transition group-hover:bg-sky-400/20">
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
