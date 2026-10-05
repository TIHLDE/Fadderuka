"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Spinner } from "~/components/ui/spinner";
import { authClient } from "~/lib/auth-client";
import { REGISTRATION_STUDIES } from "~/lib/majors";

/**
 * "Logg inn med TIHLDE", plus the local fallback.
 *
 * Almost everyone types their password on tihlde.org and comes back with a
 * scoped token. The exception is students who registered here without an
 * @stud.ntnu.no address: their TIHLDE account is not usable until it is
 * activated, so they get the username/password form at the bottom.
 */
function LoggInnSkjema() {
  const router = useRouter();
  const [lokal, setLokal] = useState(false);
  const [laster, setLaster] = useState(false);
  // Den som begynner på et nytt studium i høst må si fra selv: TIHLDE-profilen
  // deres viser fortsatt bachelorlinja og bachelorkullet, så uten dette valget
  // leses de som 2. klassing — altså fadder — og slipper å betale.
  const [nyttStudium, setNyttStudium] = useState(false);
  const [study, setStudy] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Settes når serveren ber om at passordet må fornyes, så meldingen kan vises
  // med «Glemt passord» som lenke i stedet for som ren tekst.
  const [feilkode, setFeilkode] = useState<string | null>(null);
  const feilFraTihlde = useSearchParams().get("error");

  const vist = error ?? feilFraTihlde;

  const href =
    nyttStudium && study
      ? `/api/auth/logg-inn?study=${encodeURIComponent(study)}`
      : "/api/auth/logg-inn";

  async function handleLokalInnlogging(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFeilkode(null);
    setLaster(true);

    const data = new FormData(e.currentTarget);
    const { error: innloggingsfeil, code } = await authClient.localLogin({
      user_id: (data.get("user_id") as string)?.trim(),
      password: data.get("password") as string,
    });

    if (innloggingsfeil) {
      setError(innloggingsfeil);
      setFeilkode(code ?? null);
      setLaster(false);
      return;
    }

    // Forsiden uansett: betalingsmuren der slipper inn den som har betalt og
    // tar imot den som ikke har, så det er ikke denne siden sin avgjørelse.
    router.push("/");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logg inn</CardTitle>
        <CardDescription>
          Du logger inn med TIHLDE-brukeren din på tihlde.org.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {vist && (
          <Alert variant="destructive">
            <AlertTitle>Innloggingen gikk ikke gjennom</AlertTitle>
            <AlertDescription>
              {/* Samme setning som serveren sender, men med «Glemt passord»
                  som lenke. Å plukke teksten fra hverandre på klienten ville
                  knekt neste gang noen retter et komma, så koden styrer
                  hvilken variant som vises. */}
              {feilkode === "ma_sette_nytt_passord" ? (
                <>
                  Vi har lansert ny hovedside, og du må sette nytt passord via{" "}
                  <Link href="/glemt-passord">Glemt passord</Link>. Om du har
                  godkjent TIHLDE-bruker, logg inn med den i stedet.
                </>
              ) : (
                vist
              )}
            </AlertDescription>
          </Alert>
        )}

        <FieldGroup>
          <Field orientation="horizontal">
            <Checkbox
              id="nytt-studium"
              checked={nyttStudium}
              onCheckedChange={(checked) => {
                setNyttStudium(checked);
                setError(null);
              }}
            />
            <FieldContent>
              <FieldLabel htmlFor="nytt-studium">
                Jeg begynner på et nytt studium i høst
              </FieldLabel>
              <FieldDescription>
                For eksempel Digital transformasjon etter fullført bachelor.
              </FieldDescription>
            </FieldContent>
          </Field>

          {nyttStudium && (
            <RadioGroup
              aria-label="Ny linje"
              value={study}
              onValueChange={(value) => {
                setStudy(value as string);
                setError(null);
              }}
            >
              {REGISTRATION_STUDIES.map((option) => (
                <Field key={option.slug} orientation="horizontal">
                  <RadioGroupItem
                    id={`study-${option.slug}`}
                    value={option.slug}
                  />
                  <FieldLabel htmlFor={`study-${option.slug}`}>
                    {option.label}
                  </FieldLabel>
                </Field>
              ))}
            </RadioGroup>
          )}
        </FieldGroup>

        {/* En lenke, ikke et skjema: innloggingen skjer på tihlde.org.
            Mangler linjevalget, blir det en knapp som sier fra i stedet —
            å sende dem videre uten det ville gitt feil svar på hvem som
            skal betale. */}
        {nyttStudium && !study ? (
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => setError("Velg hvilken linje du begynner på.")}
          >
            Logg inn med TIHLDE
          </Button>
        ) : (
          <Button size="lg" className="w-full" render={<a href={href} />}>
            Logg inn med TIHLDE
          </Button>
        )}
      </CardContent>

      {/* Broen for de som registrerte seg her uten NTNU-e-post. TIHLDE-
          brukeren deres er ikke aktivert ennå, så «Logg inn med TIHLDE»
          avviser dem — men de har allerede betalt. Bevisst nedtonet: alle
          andre skal bruke knappen over. */}
      <div className="px-6">
        <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
          eller
        </FieldSeparator>
      </div>
      <CardContent className="flex flex-col gap-4">
        {!lokal ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setLokal(true);
              setError(null);
            }}
          >
            Logg inn med brukernavn og passord
          </Button>
        ) : (
          <form
            onSubmit={handleLokalInnlogging}
            className="flex flex-col gap-4"
          >
            {/* De som registrerte seg før cutoveren har ikke lenger et
                passord — hashen deres ble slettet. De kommer hit, prøver det
                gamle passordet, og må få vite hvorfor det ikke virker før de
                gir opp. */}
            <Alert>
              <AlertTitle>
                Registrerte du deg før vi lanserte ny hovedside?
              </AlertTitle>
              <AlertDescription>
                Da må du sette nytt passord før du kommer inn.{" "}
                <Link href="/glemt-passord">Sett nytt passord</Link>
              </AlertDescription>
            </Alert>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="lokal-user-id">Brukernavn</FieldLabel>
                <Input
                  id="lokal-user-id"
                  name="user_id"
                  autoComplete="username"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lokal-passord">Passord</FieldLabel>
                <Input
                  id="lokal-passord"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
                <FieldDescription>
                  Bruk brukernavnet og passordet du valgte da du registrerte
                  deg. Når TIHLDE-brukeren din er aktivert, logger du inn med
                  TIHLDE i stedet.
                </FieldDescription>
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={laster} className="w-full">
              {laster ? (
                <>
                  <Spinner />
                  Logger inn...
                </>
              ) : (
                "Logg inn"
              )}
            </Button>
          </form>
        )}
        <p className="text-muted-foreground text-sm">
          Gjelder deg som registrerte deg her uten NTNU-e-post.
        </p>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-muted-foreground text-sm">
          Ny student uten TIHLDE-bruker?{" "}
          <Link href="/registrering" className="underline underline-offset-4">
            Registrer deg her
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

/**
 * `useSearchParams` opts the tree into client-side rendering, so Next requires
 * a Suspense boundary around it. Without one the whole page would have to be
 * dynamic.
 */
export default function LoggInnPage() {
  return (
    <Suspense>
      <LoggInnSkjema />
    </Suspense>
  );
}
