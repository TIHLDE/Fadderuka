import Link from "next/link";
import { cn } from "~/lib/utils";

export type ActivityCardProps = {
  title: string;
  date: string;
  location: string;
  description: string;
  imageTitle: string;
  imageSubtitle?: string;
  variant: "dark" | "light";
  href?: string;
};

function ActivityImage({
  title,
  subtitle,
  variant,
}: {
  title: string;
  subtitle?: string;
  variant: ActivityCardProps["variant"];
}) {
  const isLight = variant === "light";

  return (
    <div className="relative h-44 w-full overflow-hidden rounded-lg">
      <div
        className={cn(
          "absolute inset-0",
          isLight
            ? "bg-gradient-to-br from-white via-slate-100 to-sky-200"
            : "bg-gradient-to-br from-slate-900 via-sky-900/70 to-slate-800",
        )}
      />
      <div
        className={cn(
          "absolute inset-0",
          isLight
            ? "bg-[radial-gradient(circle_at_20%_20%,rgba(14,116,144,0.35),transparent_55%)]"
            : "bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.35),transparent_60%)]",
        )}
      />
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <span
          className={cn(
            "text-xl font-extrabold tracking-wide",
            isLight ? "text-slate-900" : "text-white",
          )}
        >
          {title}
        </span>
        {subtitle ? (
          <span
            className={cn(
              "mt-2 text-xs font-semibold uppercase tracking-[0.2em]",
              isLight ? "text-slate-600" : "text-slate-200",
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function ActivityCard({
  title,
  date,
  location,
  description,
  imageTitle,
  imageSubtitle,
  variant,
  href = "#",
}: ActivityCardProps) {
  return (
    <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-strong)] !p-6 shadow-[0_0_0_1px_var(--surface-border)] backdrop-blur">
      <ActivityImage
        title={imageTitle}
        subtitle={imageSubtitle}
        variant={variant}
      />
      <div className="mt-6 space-y-3">
        <h3 className="text-2xl font-semibold text-foreground">{title}</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{date}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/30" />
          <span>{location}</span>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Link
          href={href}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
        >
          Les mer
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
