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
        <div className="max-w-page mx-auto w-full px-4 md:px-6">
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
      <div className="no-scrollbar max-w-page mx-auto flex w-full gap-4 overflow-x-auto px-4 py-3 md:px-6">
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => setSelected(event)}
            className="group w-[135px] shrink-0 text-left transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 active:translate-y-0"
          >
            <div className="ring-foreground/10 group-hover:ring-primary/40 relative aspect-video overflow-hidden rounded-xl ring-1 transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
              <ActivityImage
                src={event.imageUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
              />
              <span className="absolute bottom-1.5 left-1.5 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-[#1D448C] shadow-sm">
                {event.type}
              </span>
            </div>
            <p className="text-foreground group-hover:text-primary mt-2 truncate text-[13px] font-medium transition-colors">
              {event.title}
            </p>
          </button>
        ))}
      </div>

      <ActivityModal activity={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
