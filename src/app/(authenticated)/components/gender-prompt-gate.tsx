"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GenderPrompt } from "~/components/gender-prompt";
import type { GENDER_VALUES } from "~/lib/gender";
import { api } from "~/trpc/react";

type GenderValue = (typeof GENDER_VALUES)[number];

/**
 * Lagrer svaret fra `GenderPrompt` og laster layouten på nytt, så appen tar
 * over for popupen når serveren ser at kjønn er satt.
 */
export default function GenderPromptGate() {
  const router = useRouter();
  const setGender = api.profile.setGender.useMutation({
    onSuccess: () => router.refresh(),
    onError: (error) => {
      toast.error("Kunne ikke lagre", { description: error.message });
    },
  });

  return (
    <GenderPrompt
      saving={setGender.isPending || setGender.isSuccess}
      onSave={(gender) => setGender.mutate({ gender: gender as GenderValue })}
    />
  );
}
