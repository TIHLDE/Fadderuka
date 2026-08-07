"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardDescription, CardTitle } from "~/components/ui/card";
import { REGISTRATION_STUDIES } from "~/lib/majors";

/**
 * "Logg inn med TIHLDE".
 *
 * No password field any more: the student types it on tihlde.org, and we get
 * back a scoped token. Everything this page still asks for is the one thing
 * their TIHLDE profile cannot tell us — see `nyttStudium` below.
 */
function LoggInnSkjema() {
  // Den som begynner på et nytt studium i høst må si fra selv: TIHLDE-profilen
  // deres viser fortsatt bachelorlinja og bachelorkullet, så uten dette valget
  // leses de som 2. klassing — altså fadder — og slipper å betale.
  const [nyttStudium, setNyttStudium] = useState(false);
  const [study, setStudy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const feilFraTihlde = useSearchParams().get("error");

  const vist = error ?? feilFraTihlde;

  const href =
    nyttStudium && study
      ? `/api/auth/logg-inn?study=${encodeURIComponent(study)}`
      : "/api/auth/logg-inn";

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl">
        <Card>
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-3xl font-bold">Logg inn</CardTitle>
              <CardDescription>
                Du logger inn med TIHLDE-brukeren din på tihlde.org.
              </CardDescription>
            </div>

            {vist && (
              <div className="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm">
                {vist}
              </div>
            )}

            <div className="border-input grid gap-3 rounded-md border px-4 py-3">
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
                    For eksempel Digital transformasjon etter fullført bachelor.
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
                      className="border-input has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm"
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

            <div className="flex flex-col gap-5">
              {/* En lenke, ikke et skjema: innloggingen skjer på tihlde.org.
                  Mangler linjevalget, blir det en knapp som sier fra i stedet
                  — å sende dem videre uten det ville gitt feil svar på hvem
                  som skal betale. */}
              {nyttStudium && !study ? (
                <Button
                  type="button"
                  className="h-12 w-full text-base"
                  onClick={() => setError("Velg hvilken linje du begynner på.")}
                >
                  Logg inn med TIHLDE
                </Button>
              ) : (
                <a
                  href={href}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-12 w-full items-center justify-center rounded-md text-base font-medium"
                >
                  Logg inn med TIHLDE
                </a>
              )}
              <p className="text-muted-foreground text-center text-sm">
                Ny student uten TIHLDE-bruker?{" "}
                <Link href="/registrering" className="underline">
                  Registrer deg her
                </Link>
              </p>
            </div>
          </div>
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
    <Suspense>
      <LoggInnSkjema />
    </Suspense>
  );
}
