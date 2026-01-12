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
    <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] !p-4 shadow-[0_0_0_1px_var(--surface-border)] transition hover:border-[color:var(--surface-border-strong)]">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-xs text-muted-foreground">{meta}</p>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex text-sm font-semibold text-primary transition hover:text-primary/80"
      >
        {"Les mer ->"}
      </Link>
    </div>
  );
}
