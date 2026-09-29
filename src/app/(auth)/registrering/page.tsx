"use client";

import { TRPCClientError } from "@trpc/client";
import Link from "next/link";
import { useState } from "react";
import type { AppRouter } from "~/server/api/root";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
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
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { VippsButton } from "~/components/ui/vipps-button";
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
    const user_id = (formData.get("user_id") as string)?.trim();
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
      user_id,
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
    <Card>
      <CardHeader>
        <CardTitle>Registrer deg for fadderuka</CardTitle>
        <CardDescription>
          Opprett en TIHLDE-bruker og betal med Vipps. Brukeren kan du senere
          bruke på tihlde.org.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <CardContent className="flex flex-col gap-5">
          <Alert>
            <AlertDescription>
              Har du allerede laget bruker på tihlde.org — for eksempel med
              Feide — skal du <Link href="/logg-inn">logge inn</Link> i stedet.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Registreringen gikk ikke gjennom</AlertTitle>
              <AlertDescription>
                {error}
                {/* Når feilen er "du har alt en bruker", er innlogging det
                    eneste som hjelper — så vi tilbyr veien dit i stedet for
                    å la dem gjette hvilket felt de skal endre. */}
                {existingUserId && (
                  <Link href="/logg-inn" className="mt-1 block">
                    Logg inn med TIHLDE som «{existingUserId}»
                  </Link>
                )}
              </AlertDescription>
            </Alert>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reg-full-name">Fullt navn</FieldLabel>
              <Input
                id="reg-full-name"
                name="full_name"
                type="text"
                autoComplete="name"
                required
                placeholder="Ola Nordmann"
              />
            </Field>

            <Field data-invalid={errorField === "email" || undefined}>
              <FieldLabel htmlFor="reg-email">E-post</FieldLabel>
              <Input
                id="reg-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="olanord@stud.ntnu.no"
                aria-invalid={errorField === "email"}
              />
              <FieldDescription>
                Bruk NTNU-e-posten din hvis du har fått den. Har du ikke det
                ennå, går det fint med en privat adresse.
              </FieldDescription>
            </Field>

            <Field data-invalid={errorField === "user_id" || undefined}>
              <FieldLabel htmlFor="reg-user-id">Brukernavn</FieldLabel>
              <Input
                id="reg-user-id"
                name="user_id"
                autoComplete="username"
                required
                maxLength={15}
                placeholder="olanord"
                aria-invalid={errorField === "user_id"}
              />
              <FieldDescription>
                Dette blir brukernavnet ditt på tihlde.org. Bruk Feide-
                brukernavnet ditt — da blir det samme konto når du senere logger
                inn med Feide.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="reg-password">Passord</FieldLabel>
              <Input
                id="reg-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Minst 8 tegn"
              />
            </Field>

            <FieldSet data-invalid={errorField === "study" || undefined}>
              <FieldLegend variant="label">
                Hvilken linje har du kommet inn på?
              </FieldLegend>
              <RadioGroup
                aria-label="Linje"
                value={study}
                onValueChange={(value) => {
                  setStudy(value as string);
                  if (errorField === "study") {
                    setError(null);
                    setErrorField(null);
                  }
                }}
              >
                {REGISTRATION_STUDIES.map((option) => (
                  <Field key={option.slug} orientation="horizontal">
                    <RadioGroupItem
                      id={`reg-study-${option.slug}`}
                      value={option.slug}
                      aria-invalid={errorField === "study"}
                    />
                    <FieldLabel htmlFor={`reg-study-${option.slug}`}>
                      {option.label}
                    </FieldLabel>
                  </Field>
                ))}
              </RadioGroup>
            </FieldSet>

            <Field>
              <FieldLabel htmlFor="reg-allergies">
                Matallergier (valgfritt)
              </FieldLabel>
              <Input
                id="reg-allergies"
                name="allergies"
                type="text"
                maxLength={500}
                placeholder="F.eks. nøtter, laktose, gluten"
              />
              <FieldDescription>
                Fyll ut kun hvis du har allergier – la stå tomt ellers.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <div className="flex flex-col gap-2">
            <VippsButton type="submit" loading={loading} className="w-full" />
            <p className="text-muted-foreground text-center text-sm">
              Brukeren opprettes først, så sendes du videre til Vipps.
            </p>
          </div>
        </CardContent>
      </form>

      <CardFooter className="justify-center">
        <p className="text-muted-foreground text-sm">
          Har du allerede TIHLDE-bruker?{" "}
          <Link href="/logg-inn" className="underline underline-offset-4">
            Logg inn
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
