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
    <div className="rounded-2xl border border-border bg-card !p-4 shadow-sm transition hover:border-border/60">
      <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
      <p className="mt-2 text-xs text-muted-foreground">{meta}</p>
      <p className="mt-3 text-sm text-card-foreground/80">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex text-sm font-semibold text-sky-500 transition hover:text-sky-400 dark:text-sky-200 dark:hover:text-sky-100"
      >
        {"Les mer ->"}
      </Link>
    </div>
  );
}