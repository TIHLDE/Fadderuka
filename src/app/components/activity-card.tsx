import Link from "next/link";
import { Card } from "~/components/ui/card";

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
    <Card className="rounded-2xl !p-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-xs text-muted-foreground">{meta}</p>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex text-sm font-semibold text-primary transition hover:text-primary/80"
      >
        {"Les mer ->"}
      </Link>
    </Card>
  );
}
