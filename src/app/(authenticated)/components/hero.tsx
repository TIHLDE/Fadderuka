import Link from "next/link";
import type { ReactNode } from "react";

import { HeroSectionBackground } from "~/components/layout/hero-section";
import { Button } from "~/components/ui/button";
import { TihldeLogo } from "~/components/ui/icons/tihlde";
import { Stagger } from "~/components/ui/motion";

/**
 * Forsidens hero, bygget som Kvark sin (apps/kvark/src/routes/_app/index.tsx):
 * bølgene bak, logo, tekst og handlinger sentrert i første skjermbilde.
 *
 * Høyden er 100svh minus headeren (3.5rem), og under lg også bunnlinja (4rem)
 * med safe-area — samme regnestykke som i Photon.
 */
export default function Hero({ children }: { children?: ReactNode }) {
  return (
    <div className="relative flex min-h-[calc(100svh_-_3.5rem_-_4rem_-_env(safe-area-inset-bottom))] flex-col lg:min-h-[calc(100svh_-_3.5rem)]">
      <HeroSectionBackground className="text-primary -z-50" />
      {/* `className` direkte på Stagger, ikke via `render` som i Photon: se
          kommentaren i PageHeader. */}
      <Stagger className="container mx-auto flex w-full flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <div
          className="flex items-center"
          style={{ color: "var(--color-logo, currentColor)" }}
        >
          <TihldeLogo variant="full" className="h-14 w-auto" />
        </div>
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-3xl text-balance">Velkommen til fadderuka</h1>
          <p className="text-balance">
            Fadderuka er to uker med aktiviteter som gir deg muligheten til å
            bli bedre kjent med de i klassen din. Her finner du aktivitetene,
            informasjon og hvilken faddergruppe du er i.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="lg" render={<Link href="/aktiviteter" />}>
            Se aktivitetene
          </Button>
          <Button
            size="lg"
            variant="outline"
            render={<Link href="/informasjon" />}
          >
            Informasjon og FAQ
          </Button>
        </div>
        {children}
      </Stagger>
    </div>
  );
}
