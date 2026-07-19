import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface GameCardProps {
  title: string;
  href: string;
}

export default function GameCard({ title, href }: GameCardProps) {
  return (
    <Link
      href={href}
      className="group ring-foreground/10 hover:ring-primary/40 relative flex h-[248px] w-full max-w-[358px] items-center justify-center overflow-hidden rounded-2xl bg-card p-6 text-card-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)] ring-1 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 active:translate-y-0"
    >
      {/* Soft brand glow that blooms on hover */}
      <div
        aria-hidden
        className="bg-primary/15 pointer-events-none absolute -top-10 -right-10 size-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <h3 className="font-heading text-foreground text-2xl font-semibold tracking-tight">
          {title}
        </h3>
        <span className="text-primary inline-flex -translate-y-1 items-center gap-1 text-sm font-medium opacity-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 group-hover:opacity-100">
          Spill nå
          <ArrowRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}