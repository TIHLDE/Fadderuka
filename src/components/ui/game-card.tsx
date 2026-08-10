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
      data-slot="card"
      className="group ring-card-border hover:ring-primary/40 relative flex h-[200px] w-full items-center justify-center overflow-hidden rounded-xl bg-card p-6 text-card-foreground ring-1"
    >
      {/* Soft brand glow that blooms on hover */}
      <div
        aria-hidden
        className="bg-primary/15 pointer-events-none absolute -top-10 -right-10 size-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <h3 className="font-heading text-foreground text-xl font-medium tracking-tight">
          {title}
        </h3>
        {/* Skjult bare der hover finnes — på touch er det ingen hover-tilstand
            å avsløre den i, så da står den synlig. */}
        <span className="text-link inline-flex items-center gap-1 text-sm font-medium transition-all group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:hover)]:-translate-y-1 [@media(hover:hover)]:opacity-0">
          Spill nå
          <ArrowRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}