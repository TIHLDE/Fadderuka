import type React from "react";

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
  description?: string;
  /** Sentrert variant, brukt på oversiktssidene. */
  centered?: boolean;
  children?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  centered = false,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        centered && "items-center text-center",
        className,
      )}
    >
      {children}
      <h1 className="font-heading text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p
          className={cn(
            "text-muted-foreground text-base text-pretty",
            centered && "mx-auto max-w-2xl",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
