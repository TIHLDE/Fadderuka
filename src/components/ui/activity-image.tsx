"use client";

import { useEffect, useState } from "react";

import { cn } from "~/lib/utils";

/**
 * Standardbildet for aktiviteter uten eget bilde — samme TIHLDE-bakgrunn som
 * Kvark (tihlde.org) bruker i `AspectRatioImg`.
 */
export const DEFAULT_ACTIVITY_IMAGE = "/tihlde-background.jpg";

type ActivityImageProps = {
  src: string | null | undefined;
  alt: string;
  /** Størrelse/hjørner for bilderammen, f.eks. `h-44 w-full rounded-lg`. */
  className?: string;
};

/**
 * Aktivitetsbilde med TIHLDE-bakgrunnen som standard.
 *
 * Standardbildet ligger som bakgrunn i rammen i stedet for at vi bytter `src`
 * ved feil: da slår det inn uansett hvorfor bildet mangler — tom URL, 404,
 * blokkert forespørsel eller en URL som aldri svarer — og vi slipper å vise en
 * tom boks mens vi venter. Et gyldig bilde tegnes rett oppå.
 */
export function ActivityImage({ src, alt, className }: ActivityImageProps) {
  // Et bilde som feiler tegner et «ødelagt bilde»-ikon oppå bakgrunnen, så vi
  // fjerner det helt i stedet.
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  return (
    <span
      className={cn("relative block overflow-hidden bg-cover bg-center", className)}
      style={{ backgroundImage: `url(${DEFAULT_ACTIVITY_IMAGE})` }}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </span>
  );
}
