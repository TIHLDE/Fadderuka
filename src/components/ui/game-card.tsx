import Link from "next/link";

interface GameCardProps {
  title: string;
  href: string;
}

export default function GameCard({ title, href }: GameCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex h-[248px] w-full max-w-[358px] items-center justify-center overflow-hidden rounded-xl bg-card text-card-foreground p-4 ring-1 ring-foreground/10 transition-colors duration-150 hover:bg-muted/50 active:translate-y-px"
    >
      <h3 className="font-heading relative z-10 text-center text-2xl font-medium tracking-tight text-foreground">
        {title}
      </h3>
    </Link>
  );
}