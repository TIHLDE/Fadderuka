import type React from "react";

import { cn } from "~/lib/utils";

type RevealProps = React.ComponentProps<"div"> & {
  /** Forsinkelse i ms før inngangen starter, for å trappe flere elementer. */
  delay?: number;
};

/**
 * Fader innholdet opp ved mount. Selve timingen ligger i globals.css under
 * `[data-slot="reveal"]`, ved siden av easing-tokenene, slik Photon gjør det.
 *
 * Dette var tidligere en klientkomponent som slo `opacity-0` → `opacity-100`
 * fra en IntersectionObserver. Den varianten har et feilmodus CSS-versjonen
 * ikke har: fyrer observeren aldri — skjult fane, ingen JS, hydrering som
 * feiler — blir innholdet stående usynlig. CSS-animasjonen deklarerer bare
 * `from`, så sluttilstanden *er* elementets vanlige computed style, og verste
 * utfall er at animasjonen uteblir mens innholdet vises.
 */
export function Reveal({ delay = 0, className, style, ...props }: RevealProps) {
  return (
    <div
      data-slot="reveal"
      style={delay ? { animationDelay: `${delay}ms`, ...style } : style}
      className={cn(className)}
      {...props}
    />
  );
}

/**
 * Lar barna komme inn 40ms fra hverandre, med tak på 5 trinn. Regelen ligger i
 * globals.css — komponenten setter bare `data-slot`.
 */
export function Stagger({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="stagger" className={cn(className)} {...props} />
  );
}
