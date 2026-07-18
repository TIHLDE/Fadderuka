"use client";

import { useEffect } from "react";
import { MapPin, X } from "lucide-react";

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

  if (!activity) return null;

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in-0 duration-200 ease-out"
      onClick={onClose}
    >
      <div
        className="relative flex h-[92vh] w-full max-w-4xl flex-col overflow-y-auto rounded-2xl bg-[color:var(--panel-bg)] shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Lukk"
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
        >
          <X className="h-5 w-5" />
        </button>

        {activity.imageUrl ? (
          <img
            src={activity.imageUrl}
            alt={activity.title}
            className="h-64 w-full shrink-0 object-cover sm:h-80"
          />
        ) : (
          <div className="flex h-64 w-full shrink-0 items-center justify-center bg-gradient-to-br from-slate-900 via-sky-900/70 to-slate-800 sm:h-80">
            <span className="px-6 text-center text-3xl font-extrabold tracking-wide text-white">
              {activity.title}
            </span>
          </div>
        )}

        <div className="flex-1 space-y-6 p-6 sm:p-10">
          <h2 className="text-3xl font-bold capitalize text-foreground sm:text-4xl">
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

          <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
            {activity.description}
          </p>
        </div>
      </div>
    </div>
  );
}
