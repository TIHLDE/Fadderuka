"use client";

// Kopiert fra Photon: apps/kvark/src/components/list-card.tsx. Bildet går
// gjennom ActivityImage i stedet for Photons asset-pipeline, så standard-
// bakgrunnen slår inn når en aktivitet mangler bilde.
import { useRender } from "@base-ui/react/use-render";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { ActivityImage } from "~/components/ui/activity-image";
import { Badge } from "~/components/ui/badge";

export type ListCardMetaRow = {
  icon: LucideIcon;
  text: ReactNode;
};

type ListCardProps = {
  render?: useRender.RenderProp;
  title: ReactNode;
  imageUrl?: string | null;
  imageAlt?: string;
  imageBadge?: ReactNode;
  titleBadge?: ReactNode;
  meta: ListCardMetaRow[];
};

export function ListCard({
  render,
  title,
  imageUrl,
  imageAlt,
  imageBadge,
  titleBadge,
  meta,
}: ListCardProps) {
  return useRender({
    render: render ?? <div />,
    props: {
      // Hover/trykk-bevegelsen ligger i globals.css, nøklet på denne sloten.
      "data-slot": "list-card",
      className:
        "flex flex-col gap-3 overflow-hidden rounded-2xl bg-card text-left ring-1 ring-card-border sm:flex-row sm:gap-3 sm:p-2 sm:transition-colors sm:hover:bg-muted/50",
      children: (
        <>
          <div className="bg-muted relative aspect-[21/9] w-full shrink-0 overflow-hidden rounded-t-2xl sm:w-52 sm:self-start sm:rounded-lg">
            <ActivityImage
              src={imageUrl}
              alt={imageAlt ?? ""}
              className="size-full object-cover"
            />
            {imageBadge ? (
              <Badge className="absolute right-2 bottom-2">{imageBadge}</Badge>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 pb-3 sm:p-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-1 text-lg sm:text-xl">{title}</h3>
              {titleBadge ? <div className="shrink-0">{titleBadge}</div> : null}
            </div>
            <div className="text-muted-foreground flex flex-col gap-1 text-sm">
              {meta.map((row, i) => (
                <div key={i} className="flex min-w-0 items-center gap-2">
                  <row.icon className="size-4 shrink-0" />
                  <span className="truncate">{row.text}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ),
    },
  });
}
