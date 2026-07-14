"use client";

import { useState } from "react";
import ActivityModal, { type ModalActivity } from "~/components/ui/activity-modal";

export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='79'%3E%3Crect width='140' height='79' fill='%231D448C'/%3E%3C/svg%3E";

interface Event extends ModalActivity {
  type: "Nyh." | "Arr.";
  imageUrl: string;
}

const placeholderEvents: Event[] = [
  {
    id: "1",
    title: "Bedriftspresentasjon med DNV",
    imageUrl: PLACEHOLDER_IMAGE,
    type: "Arr.",
    description: "Bli bedre kjent med DNV og mulighetene de tilbyr.",
    location: "Sted kommer",
    date: new Date(),
  },
  {
    id: "2",
    title: "Nye styremedlemmer valgt",
    imageUrl: PLACEHOLDER_IMAGE,
    type: "Nyh.",
    description: "Nytt styre er nå på plass for kommende periode.",
    location: "Sted kommer",
    date: new Date(),
  },
  {
    id: "3",
    title: "Fadderuka 2026 er i gang",
    imageUrl: PLACEHOLDER_IMAGE,
    type: "Nyh.",
    description: "Endelig er fadderuka her, følg med for oppdateringer.",
    location: "Sted kommer",
    date: new Date(),
  },
  {
    id: "4",
    title: "Hyttetur til Oppdal",
    imageUrl: PLACEHOLDER_IMAGE,
    type: "Arr.",
    description: "Bli med på tur til fjells sammen med faddergruppa.",
    location: "Sted kommer",
    date: new Date(),
  },
  {
    id: "5",
    title: "Åpent styremøte torsdag",
    imageUrl: PLACEHOLDER_IMAGE,
    type: "Arr.",
    description: "Alle er velkomne til å delta på det åpne styremøtet.",
    location: "Sted kommer",
    date: new Date(),
  },
  {
    id: "6",
    title: "Ny samarbeidsavtale signert",
    imageUrl: PLACEHOLDER_IMAGE,
    type: "Nyh.",
    description: "Vi har signert en ny samarbeidsavtale med næringslivet.",
    location: "Sted kommer",
    date: new Date(),
  },
  {
    id: "7",
    title: "Vinterball på Storsalen",
    imageUrl: PLACEHOLDER_IMAGE,
    type: "Arr.",
    description: "Årets vinterball arrangeres på Storsalen.",
    location: "Sted kommer",
    date: new Date(),
  },
  {
    id: "8",
    title: "Sommerjobb-messe 2026",
    imageUrl: PLACEHOLDER_IMAGE,
    type: "Arr.",
    description: "Møt bedrifter som tilbyr sommerjobber og internship.",
    location: "Sted kommer",
    date: new Date(),
  },
];

export default function HorizontalEventsList({
  events = placeholderEvents,
}: {
  events?: Event[];
}) {
  const [selected, setSelected] = useState<ModalActivity | null>(null);

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
