"use client";

import { TRPCClientError } from "@trpc/client";
import Link from "next/link";
import { useState } from "react";
import type { AppRouter } from "~/server/api/root";
import { Button } from "~/components/ui/button";
import { Card, CardDescription, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { REGISTRATION_STUDIES } from "~/lib/majors";
import { authClient } from "~/lib/auth-client";
import { PENDING_ALLERGY_KEY } from "~/lib/pending-allergy";
import { api } from "~/trpc/react";

export default function RegistreringPage() {
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  /** Set when they already have an account, so we can link straight to login. */
  const [existingUserId, setExistingUserId] = useState<string | null>(null);
  const [study, setStudy] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const initiatePayment = api.payment.initiatePayment.useMutation();

  // One submit that (1) creates a real TIHLDE account, (2) logs the user into
  // the app, and (3) sends them to Vipps to pay for fadderuka.
  const handleRegister = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setErrorField(null);
    setExistingUserId(null);

    const formData = new FormData(e.currentTarget);
    const full_name = (formData.get("full_name") as string)?.trim();
    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;
    const allergies = (formData.get("allergies") as string)?.trim();

    if (!study) {
      setError("Velg hvilken linje du går på.");
      setErrorField("study");
      return;
    }

    setLoading(true);

    const {
      error: registerError,
      field,
      existingUserId: existing,
    } = await authClient.register({
      full_name,
      email,
      password,
      study,
    });

    if (registerError) {
      setError(registerError);
      setErrorField(field ?? null);
      setExistingUserId(existing ?? null);
      setLoading(false);
      return;
    }

    // Allergies live in TIHLDE, not our DB. The account is still pending here
    // (no TIHLDE token yet), so buffer the value and let `AllergySync` push it
    // to the TIHLDE profile on a later authenticated load after activation.
    if (allergies) {
      try {
        localStorage.setItem(PENDING_ALLERGY_KEY, allergies);
      } catch {
        // Non-critical: the user can always set allergies on tihlde.org.
      }
    }

    // Account created + logged in — hand off to Vipps to pay.
    try {
      const { redirectUrl } = await initiatePayment.mutateAsync();
      window.location.href = redirectUrl;
    } catch (err) {
      // The server refuses to charge anyone who owes nothing. Someone who
      // turns out to be a fadder is simply let into the app instead of being
      // shown a payment error for a bill that doesn't exist.
      if (
        err instanceof TRPCClientError &&
        (err as TRPCClientError<AppRouter>).data?.code === "FORBIDDEN"
      ) {
        window.location.href = "/";
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : "Kunne ikke starte betalingen. Prøv igjen.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl">
        <Card>
          <form
            onSubmit={handleRegister}
            className="flex flex-col gap-6 p-6 sm:p-8"
          >
            <div className="flex flex-col gap-2">
              <CardTitle className="text-3xl font-bold">
                Registrer deg for Fadderuka
              </CardTitle>
              <CardDescription>
                Opprett en TIHLDE-bruker og betal med Vipps. Brukeren kan du
                senere bruke på tihlde.org. Har du allerede laget bruker på
                tihlde.org — for eksempel med Feide — skal du{" "}
                <Link href="/logg-inn" className="underline">
                  logge inn
                </Link>{" "}
                i stedet.
              </CardDescription>
            </div>

            {error && (
              <div
                className="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm"
                role="alert"
              >
                {error}
                {/* Når feilen er "du har alt en bruker", er innlogging det
                      eneste som hjelper — så vi tilbyr veien dit i stedet for
                      å la dem gjette hvilket felt de skal endre. */}
                {existingUserId && (
                  <Link
                    href="/logg-inn"
                    className="mt-2 block font-semibold underline"
                  >
                    Logg inn med TIHLDE som «{existingUserId}»
                  </Link>
                )}
              </div>
            )}

            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="reg-full-name">
                  Fullt navn <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reg-full-name"
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Ola Nordmann"
                  className="h-12"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reg-email">
                  NTNU-e-post <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reg-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="olanord@stud.ntnu.no"
                  aria-invalid={errorField === "email"}
                  className="h-12"
                />
                <p className="text-muted-foreground text-xs">
                  Bruk NTNU-e-posten din. Brukernavnet ditt på tihlde.org blir
                  det som står foran @stud.ntnu.no.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reg-password">
                  Passord <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reg-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="minst 8 tegn"
                  className="h-12"
                />
              </div>

              <div className="grid gap-2">
                <span className="text-sm font-medium">
                  Hvilken linje har du kommet inn på?{" "}
                  <span className="text-destructive">*</span>
                </span>
                <div
                  className="grid gap-2"
                  role="radiogroup"
                  aria-label="Linje"
                >
                  {REGISTRATION_STUDIES.map((option) => (
                    <label
                      key={option.slug}
                      className="border-input has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm"
                    >
                      <input
                        type="radio"
                        name="study"
                        value={option.slug}
                        checked={study === option.slug}
                        onChange={(e) => {
                          setStudy(e.target.value);
                          if (errorField === "study") {
                            setError(null);
                            setErrorField(null);
                          }
                        }}
                        className="h-4 w-4"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reg-allergies">Matallergier</Label>
                <Input
                  id="reg-allergies"
                  name="allergies"
                  type="text"
                  maxLength={500}
                  placeholder="F.eks. nøtter, laktose, gluten"
                  className="h-12"
                />
                <p className="text-muted-foreground text-xs">
                  Fyll ut kun hvis du har allergier – la stå tomt ellers.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <Button
                type="submit"
                className="h-12 w-full text-base"
                disabled={loading}
              >
                {loading ? "Registrerer..." : "Registrer og betal med Vipps"}
              </Button>
              <p className="text-muted-foreground text-center text-sm">
                Har du allerede TIHLDE-bruker?{" "}
                <Link href="/logg-inn" className="underline">
                  Logg inn
                </Link>
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
