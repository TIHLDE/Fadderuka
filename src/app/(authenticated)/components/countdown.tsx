"use client";

import { useEffect, useState } from "react";

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

export default function Countdown({
  title,
  target,
}: {
  title: string;
  target: Date;
}) {
  const [remaining, setRemaining] = useState(() => getRemaining(target));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getRemaining(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  const units = [
    { label: "Dager", value: remaining.days },
    { label: "Timer", value: remaining.hours },
    { label: "Min", value: remaining.minutes },
    { label: "Sek", value: remaining.seconds },
  ];

  return (
    <div className="max-w-page mx-auto w-full px-4 pt-10 text-center md:px-6">
      <p className="text-sm font-medium text-muted-foreground">
        {remaining.done
          ? "Aktiviteten har startet"
          : `Neste happening! (${title}) om`}
      </p>
      <div className="mt-4 flex items-start justify-center gap-6 sm:gap-10">
        {units.map((unit) => (
          <div key={unit.label} className="flex flex-col items-center">
            <span className="text-5xl font-bold tabular-nums tracking-tight text-foreground sm:text-6xl md:text-7xl">
              {String(unit.value).padStart(2, "0")}
            </span>
            <span className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:text-sm">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
