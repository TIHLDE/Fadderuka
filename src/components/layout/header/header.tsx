import React, { Suspense } from "react";

import HeaderButtonsWrapper from "./header-buttons-wrapper";
import HeaderSkeleton from "./header-skeleton";

/**
 * Sticky, gjennomskinnelig header uten bunnkant — samme oppsett som Photon.
 * Nav-lenkene skjules under lg, der bunnlinja (SiteBottomBar) tar over.
 */
export default function Header() {
  return (
    <header className="bg-background/80 sticky top-0 z-40 w-full backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
        <Suspense fallback={<HeaderSkeleton />}>
          <HeaderButtonsWrapper />
        </Suspense>
      </div>
    </header>
  );
}
