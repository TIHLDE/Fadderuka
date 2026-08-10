"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MapPin, X } from "lucide-react";

import Markdown from "~/components/ui/markdown";
import { ActivityImage } from "~/components/ui/activity-image";

export interface ModalActivity {
  id: string;
  title: string;
  description: string;
  location: string;
  date: Date;
  imageUrl: string | null;
}

export default function ActivityModal({
  activity,
  onClose,
}: {
  activity: ModalActivity | null;
  onClose: () => void;
}) {
  // Rendered into `document.body` via a portal: an ancestor with a transform,
  // filter or `will-change` (e.g. the `Reveal` wrappers the lists sit inside)
  // becomes the containing block for `position: fixed`, which offsets the modal
  // and shrinks its backdrop so clicks outside it stop closing.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!activity) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [activity, onClose]);

  if (!activity || !mounted) return null;

  const date = new Date(activity.date);
  const dateStr = date.toLocaleDateString("no-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("no-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 supports-[backdrop-filter]:backdrop-blur-xs animate-in fade-in-0 duration-100 ease-out"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-y-auto rounded-xl bg-popover text-popover-foreground ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Lukk"
          className="absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-lg bg-background/60 text-foreground ring-1 ring-foreground/10 transition-colors hover:bg-accent"
        >
          <X className="h-5 w-5" />
        </button>

        <ActivityImage
          src={activity.imageUrl}
          alt={activity.title}
          className="h-64 w-full shrink-0 object-cover sm:h-80"
        />

        <div className="flex-1 space-y-6 p-6 sm:p-10">
          <h2 className="font-heading text-3xl font-semibold tracking-tight capitalize text-foreground sm:text-4xl">
            {activity.title}
          </h2>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground sm:text-base">
            <span className="capitalize">{dateStr}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/30" />
            <span>{timeStr}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/30" />
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {activity.location.startsWith("http") ? (
                <a
                  href={activity.location}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary transition hover:text-primary/80"
                >
                  Vis på kart
                </a>
              ) : (
                activity.location
              )}
            </span>
          </div>

          <Markdown className="text-base text-muted-foreground">
            {activity.description}
          </Markdown>
        </div>
      </div>
    </div>,
    document.body,
  );
}
