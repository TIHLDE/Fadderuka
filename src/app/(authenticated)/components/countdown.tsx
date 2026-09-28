"use client";

import { useEffect, useState } from "react";
import ActivityModal, {
  type ModalActivity,
} from "~/components/ui/activity-modal";
import { Reveal } from "~/components/ui/motion";

function getRemaining(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: diff <= 0,
  };
}

export default function Countdown({ activity }: { activity: ModalActivity }) {
  const target = activity.date;
  const [remaining, setRemaining] = useState<ReturnType<
    typeof getRemaining
  > | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setRemaining(getRemaining(target));
    const interval = setInterval(() => {
      setRemaining(getRemaining(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  const units = [
    { label: "Dager", value: remaining?.days },
    { label: "Timer", value: remaining?.hours },
    { label: "Min", value: remaining?.minutes },
    { label: "Sek", value: remaining?.seconds },
  ];

  return (
    <Reveal className="flex flex-col items-center">
      <p className="text-muted-foreground text-sm">
        {remaining?.done ? (
          "Aktiviteten har startet"
        ) : (
          <>
            Neste aktivitet:{" "}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-link hover:underline"
            >
              {activity.title}
            </button>
          </>
        )}
      </p>
      <div className="mt-3 flex items-stretch justify-center gap-2 sm:gap-3">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="bg-card ring-card-border flex min-w-16 flex-col items-center gap-1 rounded-xl px-3 py-3 ring-1 sm:min-w-20"
          >
            <span className="text-3xl tabular-nums sm:text-4xl">
              {String(unit.value ?? 0).padStart(2, "0")}
            </span>
            <span className="text-muted-foreground text-xs">{unit.label}</span>
          </div>
        ))}
      </div>
      <ActivityModal
        activity={open ? activity : null}
        onClose={() => setOpen(false)}
      />
    </Reveal>
  );
}
