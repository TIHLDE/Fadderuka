"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { GENDER_FILTERS, type GenderFilter } from "~/lib/gender";

/** Kjønnsfilteret i adminpanelet (#145): «Alle», hvert kjønn og «Ikke oppgitt». */
export function GenderFilterSelect({
  value,
  onValueChange,
  className,
}: {
  value: GenderFilter;
  onValueChange: (value: GenderFilter) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next!)}>
      <SelectTrigger aria-label="Filtrer på kjønn" className={className}>
        <SelectValue>
          {(current) =>
            GENDER_FILTERS.find((f) => f.value === current)?.label ??
            "Alle kjønn"
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {GENDER_FILTERS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
