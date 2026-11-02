"use client";

import { UsersRound } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Field, FieldLabel } from "~/components/ui/field";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { GENDERS } from "~/lib/gender";

/**
 * Spørsmålet om kjønn for de som ikke har svart (#145).
 *
 * Gjelder dem som logger inn med TIHLDE og derfor aldri så registrerings-
 * skjemaet, og alle som fantes før feltet kom. Layouten viser den i stedet for
 * appen, akkurat som betalingspopupen, så den kan ikke lukkes uten et svar.
 * Selve lagringen skjer hos forelderen; denne bare viser valgene.
 */
export function GenderPrompt({
  saving,
  onSave,
}: {
  saving: boolean;
  onSave: (gender: string) => void;
}) {
  const [gender, setGender] = useState("");

  return (
    <Dialog open disablePointerDismissal>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="bg-muted mb-2 flex size-10 items-center justify-center rounded-lg">
            <UsersRound className="size-5" />
          </div>
          <DialogTitle>Hvilket kjønn er du?</DialogTitle>
          <DialogDescription>
            Bare FadderKom ser dette. Vi bruker det når vi setter sammen
            faddergruppene. Du kan endre det senere i menyen under profilbildet
            ditt.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup
          aria-label="Kjønn"
          value={gender}
          onValueChange={(value) => setGender(value as string)}
        >
          {GENDERS.map((option) => (
            <Field key={option.value} orientation="horizontal">
              <RadioGroupItem
                id={`prompt-gender-${option.value}`}
                value={option.value}
              />
              <FieldLabel htmlFor={`prompt-gender-${option.value}`}>
                {option.label}
              </FieldLabel>
            </Field>
          ))}
        </RadioGroup>
        <Button
          className="w-full"
          disabled={!gender || saving}
          onClick={() => onSave(gender)}
        >
          {saving ? "Lagrer..." : "Lagre"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
