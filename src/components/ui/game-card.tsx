import Link from "next/link";

interface GameCardProps {
  title: string;
  href: string;
}

export default function GameCard({ title, href }: GameCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex h-[248px] w-full max-w-[358px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#02376E] to-[#011830] p-4 shadow-lg transition-all duration-300 hover:border-white/20 hover:shadow-xl hover:scale-[1.02]"
    >
      {/* Glow effect on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-sky-400/10 to-transparent" />
      
      <h3 className="relative z-10 text-center text-2xl font-bold text-white">
        {title}
      </h3>
    </Link>
  );
}