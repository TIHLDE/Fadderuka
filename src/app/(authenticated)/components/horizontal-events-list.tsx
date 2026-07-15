"use client";

import { useState } from "react";
import ActivityModal, { type ModalActivity } from "~/components/ui/activity-modal";

export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='79'%3E%3Crect width='140' height='79' fill='%231D448C'/%3E%3C/svg%3E";

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
    <div className="py-8">
      <div className="no-scrollbar max-w-page mx-auto flex w-full gap-4 overflow-x-auto px-4 md:px-6">
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => setSelected(event)}
            className="group w-[135px] shrink-0 text-left transition-transform hover:scale-105"
          >
            <div className="relative aspect-video overflow-hidden rounded-[6px] shadow-sm transition-shadow group-hover:shadow-md">
              <img
                src={event.imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-1.5 left-1.5 rounded-[4px] bg-white px-1.5 py-0.5 text-[11px] font-medium text-[#1D448C] shadow-sm">
                {event.type}
              </span>
            </div>
            <p className="text-foreground mt-2 truncate text-[13px] font-medium">
              {event.title}
            </p>
          </button>
        ))}
      </div>

      <ActivityModal activity={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
