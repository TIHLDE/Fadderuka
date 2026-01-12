import Link from "next/link";

interface ActivityCardProps {
  title: string;
  meta: string;
  description: string;
  href: string;
}

export default function ActivityCard({
  title,
  meta,
  description,
  href,
}: ActivityCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#101728] via-[#0f1628] to-[#0b1222] !p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(15,23,42,0.6)] transition hover:border-white/20 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_0_0_1px_rgba(30,41,59,0.8)]">
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-xs text-slate-400">{meta}</p>
      <p className="mt-3 text-sm text-slate-300">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex text-sm font-semibold text-sky-200 transition hover:text-sky-100"
      >
        {"Les mer ->"}
      </Link>
    </div>
  );
}