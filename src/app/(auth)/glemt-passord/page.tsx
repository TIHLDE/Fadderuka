"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";

/**
 * Ask for a reset link. Only useful for accounts with a local password — those
 * whose TIHLDE account is still pending — so the copy points everyone else at
 * tihlde.org rather than leaving them to guess why no mail arrives.
 */
export default function GlemtPassordPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const userId = (formData.get("user_id") as string)?.trim();

    const res = await fetch("/api/auth/glemt-passord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    const body = (await res.json().catch(() => null)) as {
      error?: string;
      message?: string;
    } | null;

    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Noe gikk galt. Prøv igjen.");
      return;
    }
    setSent(body?.message ?? "Sjekk e-posten din.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Glemt passord</CardTitle>
        <CardDescription>
          Skriv inn brukernavnet ditt, så sender vi en lenke til e-postadressen
          som står på kontoen din.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {sent ? (
          <Alert>
            <AlertDescription>{sent}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <FieldGroup>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="user_id">Brukernavn</FieldLabel>
                <Input
                  id="user_id"
                  name="user_id"
                  type="text"
                  autoComplete="username"
                  placeholder="Ditt TIHLDE-brukernavn"
                  required
                  aria-invalid={error ? true : undefined}
                />
                {error && <FieldError>{error}</FieldError>}
              </Field>
            </FieldGroup>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Spinner />
                  Sender...
                </>
              ) : (
                "Send lenke"
              )}
            </Button>

            <p className="text-muted-foreground text-sm">
              Er TIHLDE-brukeren din godkjent på tihlde.org, logger du inn med
              TIHLDE-passordet ditt — det tilbakestiller du på{" "}
              <a
                href="https://tihlde.org/glemt-passord"
                className="underline underline-offset-4"
                target="_blank"
                rel="noreferrer"
              >
                tihlde.org
              </a>
              , ikke her.
            </p>
          </form>
        )}
      </CardContent>

      <CardFooter className="justify-center">
        <Link
          href="/logg-inn"
          className="text-muted-foreground text-sm underline underline-offset-4"
        >
          Tilbake til innlogging
        </Link>
      </CardFooter>
    </Card>
  );
}
