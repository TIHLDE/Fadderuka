"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { GenderSelect } from "~/components/gender-select";
import { Field, FieldLabel } from "~/components/ui/field";
import type { GENDER_VALUES } from "~/lib/gender";
import { api } from "~/trpc/react";

type GenderValue = (typeof GENDER_VALUES)[number];

/**
 * Kjønnsvalget i profilmenyen (#145): endres valget, lagres det med en gang.
 * Viser det nye valget mens lagringen pågår, og går tilbake hvis den feiler.
 */
export function ProfileGenderField({ gender }: { gender: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(gender);

  const setGender = api.profile.setGender.useMutation({
    onSuccess: () => {
      toast("Kjønn lagret");
      router.refresh();
    },
    onError: (error) => {
      setValue(gender);
      toast.error("Kunne ikke lagre", { description: error.message });
    },
  });

  return (
    <Field>
      <FieldLabel htmlFor="profil-kjonn">Kjønn</FieldLabel>
      <GenderSelect
        id="profil-kjonn"
        value={value}
        disabled={setGender.isPending}
        onValueChange={(next) => {
          setValue(next);
          setGender.mutate({ gender: next as GenderValue });
        }}
      />
    </Field>
  );
}
