"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { GENDERS, genderLabel } from "~/lib/gender";

/** Nedtrekksliste for eget kjønn. Verdien og hva som skjer ved endring kommer inn som props. */
export function GenderSelect({
  id,
  value,
  disabled,
  onValueChange,
}: {
  id?: string;
  value: string | null;
  disabled?: boolean;
  onValueChange: (gender: string) => void;
}) {
  return (
    <Select
      value={value ?? ""}
      disabled={disabled}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue>
          {(current) =>
            current ? genderLabel(current as string) : "Velg kjønn"
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {GENDERS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
