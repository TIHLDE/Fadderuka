"use client";

import { useEffect, useState } from "react";
import ActivityModal, {
  type ModalActivity,
} from "~/components/ui/activity-modal";
import { Reveal } from "~/components/ui/reveal";

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
    <Reveal className="max-w-page mx-auto w-full px-4 pt-10 text-center md:px-6">
      <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
        {remaining?.done ? (
          "Aktiviteten har startet"
        ) : (
          <>
            Neste happening —{" "}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="hover:text-foreground underline underline-offset-4 transition-colors"
            >
              {activity.title}
            </button>
          </>
        )}
      </p>
      <div className="mt-5 flex items-stretch justify-center gap-2.5 sm:gap-4">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="bg-card ring-foreground/10 flex min-w-[68px] flex-col items-center gap-1 rounded-2xl px-3 py-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)] ring-1 sm:min-w-[92px] sm:px-5"
          >
            <span className="font-heading text-foreground text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl md:text-6xl">
              {String(unit.value ?? 0).padStart(2, "0")}
            </span>
            <span className="text-muted-foreground text-[10px] font-medium tracking-[0.15em] uppercase sm:text-xs">
              {unit.label}
            </span>
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
