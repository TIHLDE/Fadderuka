"use client";

import { useState } from "react";
import ActivityModal, { type ModalActivity } from "~/components/ui/activity-modal";
import {
  ActivityImage,
  DEFAULT_ACTIVITY_IMAGE,
} from "~/components/ui/activity-image";

export const PLACEHOLDER_IMAGE = DEFAULT_ACTIVITY_IMAGE;

interface Event extends ModalActivity {
  type: "Nyh." | "Arr.";
  imageUrl: string;
}

export default function HorizontalEventsList({ events }: { events: Event[] }) {
  const [selected, setSelected] = useState<ModalActivity | null>(null);

  if (events.length === 0) {
    return (
      <div className="py-8">
        <div className="container mx-auto w-full px-4">
          <p className="text-muted-foreground py-8 text-center text-sm">
            Ingen kommende aktiviteter enda.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-5">
      {/* py-3 gives the hover lift (-translate-y-1) room inside the scroll
          container — overflow-x-auto makes overflow-y clip, so without it the
          lifted card is cropped at the top. */}
      {/* `snap-x` gir kortene et fast stoppunkt, og siden `.no-scrollbar`
          skjuler scrollbaren helt er det eneste hintet om at raden kan dras.
          Kortene er bredere enn de gamle 135px, som ga et 76px høyt bilde. */}
      {/* `scroll-px-4` må matche `px-4`: uten den justerer snap-start mot
          scrollportens kant og scroller forbi paddingen, så første kort havner
          16px til venstre for overskriften over. */}
      <div className="no-scrollbar container mx-auto flex w-full snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 py-3">
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => setSelected(event)}
            data-slot="list-card"
            className="group w-[180px] shrink-0 snap-start text-left sm:w-[220px]"
          >
            <div className="ring-card-border group-hover:ring-primary/40 relative aspect-video overflow-hidden rounded-xl ring-1 transition-colors">
              <ActivityImage
                src={event.imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              <span className="bg-background/90 text-foreground absolute bottom-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium backdrop-blur-xs">
                {event.type}
              </span>
            </div>
            <p className="text-foreground group-hover:text-link mt-2 truncate text-sm font-medium transition-colors">
              {event.title}
            </p>
          </button>
        ))}
      </div>

      <ActivityModal activity={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
