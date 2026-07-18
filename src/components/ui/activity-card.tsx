import Link from "next/link";

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
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="relative h-44 w-full overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <span className="font-heading text-foreground text-xl font-medium tracking-tight">
          {title}
        </span>
        {subtitle ? (
          <span className="text-muted-foreground mt-2 text-xs font-semibold tracking-[0.2em] uppercase">
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
  href = "#",
}: ActivityCardProps) {
  return (
    <div className="rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10 !p-6 transition-colors hover:bg-muted/50">
      <ActivityImage title={imageTitle} subtitle={imageSubtitle} />
      <div className="mt-6 space-y-3">
        <h3 className="font-heading text-foreground text-2xl font-medium tracking-tight">{title}</h3>
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <span>{date}</span>
          <span className="bg-foreground/30 h-1.5 w-1.5 rounded-full" />
          <span>{location}</span>
        </div>
        <p className="text-muted-foreground text-sm">{description}</p>
        <Link
          href={href}
          className="text-primary hover:text-primary/80 inline-flex items-center gap-2 text-sm font-semibold transition"
        >
          Les mer
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
