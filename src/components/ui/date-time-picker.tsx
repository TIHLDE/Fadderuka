"use client";

import * as React from "react";
import { CalendarIcon, Clock } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

const DEFAULT_HOUR = 18;

const labelFormatter = new Intl.DateTimeFormat("no-NO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const captionFormatter = new Intl.DateTimeFormat("no-NO", {
  month: "long",
  year: "numeric",
});

const weekdayFormatter = new Intl.DateTimeFormat("no-NO", { weekday: "short" });

function toTimeString(date: Date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function DateTimePicker({
  value,
  onChange,
  id,
  placeholder = "Velg dato og tid",
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  id?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);

  const handleSelectDay = (day: Date | undefined) => {
    if (!day) {
      onChange(undefined);
      return;
    }
    // Preserve the currently selected time (or fall back to a sensible default).
    const next = new Date(day);
    if (value) {
      next.setHours(value.getHours(), value.getMinutes(), 0, 0);
    } else {
      next.setHours(DEFAULT_HOUR, 0, 0, 0);
    }
    onChange(next);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, m] = e.target.value.split(":").map(Number);
    const base = value ? new Date(value) : new Date();
    base.setHours(h ?? 0, m ?? 0, 0, 0);
    onChange(base);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start gap-2 font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="size-4 shrink-0" />
          <span className="truncate">
            {value ? labelFormatter.format(value) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelectDay}
          defaultMonth={value}
          autoFocus
          weekStartsOn={1}
          formatters={{
            formatCaption: (month) => captionFormatter.format(month),
            formatWeekdayName: (day) => weekdayFormatter.format(day),
          }}
        />
        <div className="flex items-center gap-2 border-t p-3">
          <Clock className="text-muted-foreground size-4 shrink-0" />
          <label htmlFor={`${id ?? "datetime"}-time`} className="sr-only">
            Klokkeslett
          </label>
          <input
            id={`${id ?? "datetime"}-time`}
            type="time"
            value={value ? toTimeString(value) : ""}
            onChange={handleTimeChange}
            className="border-input bg-background text-foreground focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
