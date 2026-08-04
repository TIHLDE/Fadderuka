import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader, PageShell } from "~/components/layout/page-shell";

export default function HundreSporsmalPage() {
  return (
    <PageShell className="max-w-2xl">
      <Link
        href="/drikkeleker"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 self-start text-sm font-medium transition-colors"
      >
        <ArrowLeft className="size-4" />
        Tilbake til drikkeleker
      </Link>

      <PageHeader
        centered
        title="100 spørsmål"
        description="Dette er en enkel placeholderside. Vi legger inn reglene og innholdet senere."
      />
    </PageShell>
  );
}
