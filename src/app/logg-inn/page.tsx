"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardDescription, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/lib/auth-client";
import { REGISTRATION_STUDIES } from "~/lib/majors";

function LoggInnSkjema() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Den som begynner på et nytt studium i høst må si fra selv: TIHLDE-profilen
  // deres viser fortsatt bachelorlinja og bachelorkullet, så uten dette valget
  // leses de som 2. klassing — altså fadder — og slipper å betale.
  const [nyttStudium, setNyttStudium] = useState(false);
  const [study, setStudy] = useState("");
  const router = useRouter();
  // Registreringssiden sender hit med brukernavnet når noen prøvde å
  // registrere seg på nytt — da slipper de å huske hva de valgte.
  const prefilledUserId = useSearchParams().get("user_id") ?? "";

  const handleLogin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (nyttStudium && !study) {
      setError("Velg hvilken linje du begynner på.");
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const userId = (formData.get("user_id") as string)?.trim();
    const password = formData.get("password") as string;

    const { error } = await authClient.signIn(
      userId,
      password,
      nyttStudium ? study : undefined,
    );

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          <Card>
            <form onSubmit={handleLogin} className="flex flex-col gap-6 p-6 sm:p-8">
              <div
                className="flex flex-col gap-2"
              >
                <CardTitle className="text-3xl font-bold">Logg inn</CardTitle>
                <CardDescription>
                  Logg inn med ditt TIHLDE-brukernavn og passord
                </CardDescription>
              </div>

              {error && (
                <div
                  className="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm"
                  
                >
                  {error}
                </div>
              )}

              <div
                className="flex flex-col gap-6"
              >
                <div className="grid gap-2">
                  <Label htmlFor="login-user-id">
                    Brukernavn <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="login-user-id"
                    name="user_id"
                    type="text"
                    autoComplete="username"
                    required
                    defaultValue={prefilledUserId}
                    placeholder="ditt TIHLDE-brukernavn"
                    className="h-12"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor="login-password">
                      Passord <span className="text-destructive">*</span>
                    </Label>
                    <Link
                      href="/glemt-passord"
                      className="text-muted-foreground text-sm underline"
                    >
                      Glemt passord?
                    </Link>
                  </div>
                  <Input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="h-12"
                  />
                </div>

                <div className="grid gap-3 rounded-md border border-input px-4 py-3">
                  <label className="flex cursor-pointer items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={nyttStudium}
                      onChange={(e) => {
                        setNyttStudium(e.target.checked);
                        setError(null);
                      }}
                      className="mt-0.5 h-4 w-4"
                    />
                    <span>
                      <span className="font-medium">
                        Jeg begynner på et nytt studium i høst
                      </span>
                      <span className="text-muted-foreground block">
                        For eksempel Digital transformasjon etter fullført
                        bachelor.
                      </span>
                    </span>
                  </label>

                  {nyttStudium && (
                    <div
                      className="grid gap-2"
                      role="radiogroup"
                      aria-label="Ny linje"
                    >
                      {REGISTRATION_STUDIES.map((option) => (
                        <label
                          key={option.slug}
                          className="flex cursor-pointer items-center gap-3 rounded-md border border-input px-4 py-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                        >
                          <input
                            type="radio"
                            name="study"
                            value={option.slug}
                            checked={study === option.slug}
                            onChange={(e) => {
                              setStudy(e.target.value);
                              setError(null);
                            }}
                            className="h-4 w-4"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <Button
                  type="submit"
                  className="h-12 w-full text-base"
                  disabled={loading}
                >
                  {loading ? "Logger inn..." : "Logg inn"}
                </Button>
                <p className="text-muted-foreground text-center text-sm">
                  Ny student uten TIHLDE-bruker?{" "}
                  <Link href="/registrering" className="underline">
                    Registrer deg her
                  </Link>
                </p>
              </div>
            </form>
          </Card>
        </div>
    </div>
  );
}

/**
 * `useSearchParams` opts the tree into client-side rendering, so Next requires
 * a Suspense boundary around it. Without one the whole page would have to be
 * dynamic.
 */
export default function LoggInnPage() {
  return (
    <Suspense fallback={null}>
      <LoggInnSkjema />
    </Suspense>
  );
}
