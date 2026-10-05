"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";

export function NyttPassordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const repeat = formData.get("password_repeat") as string;

    if (password !== repeat) {
      setError("Passordene er ikke like.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/nytt-passord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Noe gikk galt. Prøv igjen.");
      setLoading(false);
      return;
    }

    // Setting the password logs every session out, so the way back in is the
    // login page — with the new password.
    const body = (await res.json().catch(() => null)) as {
      tihldeUserId?: string;
    } | null;
    const query = body?.tihldeUserId
      ? `?user_id=${encodeURIComponent(body.tihldeUserId)}`
      : "";
    router.push(`/logg-inn${query}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="password">Nytt passord</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Minst 8 tegn"
            required
            minLength={8}
          />
        </Field>

        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="password_repeat">Gjenta passordet</FieldLabel>
          <Input
            id="password_repeat"
            name="password_repeat"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-invalid={error ? true : undefined}
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Spinner />
            Lagrer...
          </>
        ) : (
          "Lagre passord"
        )}
      </Button>
    </form>
  );
}
