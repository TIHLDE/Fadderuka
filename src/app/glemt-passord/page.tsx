"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardDescription, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

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
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl">
        <Card>
          <div className="flex flex-col gap-6 p-8 sm:p-12">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-3xl font-bold">Glemt passord</CardTitle>
              <CardDescription>
                Skriv inn brukernavnet ditt, så sender vi en lenke til
                e-postadressen som står på kontoen din.
              </CardDescription>
            </div>

            {sent ? (
              <>
                <p className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm">
                  {sent}
                </p>
                <Link href="/logg-inn" className="text-sm underline">
                  Tilbake til innlogging
                </Link>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="user_id">Brukernavn</Label>
                  <Input
                    id="user_id"
                    name="user_id"
                    type="text"
                    autoComplete="username"
                    placeholder="ditt TIHLDE-brukernavn"
                    required
                    className="h-12"
                  />
                </div>

                {error && <p className="text-destructive text-sm">{error}</p>}

                <Button type="submit" disabled={loading} className="h-12 w-full">
                  {loading ? "Sender..." : "Send lenke"}
                </Button>

                <CardDescription>
                  Er TIHLDE-brukeren din godkjent på tihlde.org, logger du inn
                  med TIHLDE-passordet ditt — det tilbakestiller du på{" "}
                  <a
                    href="https://tihlde.org/glemt-passord"
                    className="underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    tihlde.org
                  </a>
                  , ikke her.
                </CardDescription>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
