import type React from "react";

import { Reveal } from "~/components/ui/motion";
import { cn } from "~/lib/utils";

/**
 * Innholdskolonnen hver side deler. Photon har ingen egen komponent for dette
 * — der gjentas klassestrengen i hver rute — men her sto den samme blokka
 * kopiert åtte steder med varianter som hadde drevet fra hverandre, så én
 * komponent er billigere å holde i sync.
 *
 * `container mx-auto px-4` er Photons idiom. Den gamle `max-w-page`
 * (`min(80rem, 90%)`) spiste 10% av bredden på alle skjermer, som på telefon
 * ble ~18% sammen med px-4.
 */
export function PageShell({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "container mx-auto flex w-full flex-col gap-6 px-4 py-8",
        className,
      )}
      {...props}
    />
  );
}

type PageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
};

/**
 * Tittel, valgfri beskrivelse og en valgfri handling (vanligvis en knapp)
 * justert mot slutten. Kopiert fra Photon: apps/kvark/src/components/page-header.tsx.
 */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    // `className` rett på Reveal, ikke via `render` som i Photon: et element
    // sendt fra en serverkomponent mister klassene sine ved SSR, og Next
    // melder hydrerings-mismatch.
    <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </Reveal>
  );
}
