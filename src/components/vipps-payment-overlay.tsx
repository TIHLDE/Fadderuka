"use client";

import { Loader2, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { api } from "~/trpc/react";

export default function VippsPaymentOverlay() {

  const paymentStatus = api.payment.getStatus.useQuery();

  const initiatePayment = api.payment.initiatePayment.useMutation({
    onSuccess: (data) => {
      window.location.href = data.redirectUrl;
    },
    onError: (error) => {
      toast.error("Feil", { description: error.message });
    },
  });

  const checkPayment = api.payment.checkMyPayment.useMutation({
    onSuccess: (data) => {
      if (data.found) {
        toast("Betaling funnet!", { description: "Du er nå registrert." });
        void paymentStatus.refetch();
      } else {
        toast.error("Ingen betaling funnet", {
          description:
            "Vi fant ingen fullført betaling ennå. Prøv å betale med Vipps.",
        });
      }
    },
    onError: (error) => {
      toast.error("Feil", { description: error.message });
    },
  });

  // Nothing to ask for if they've paid, are already verified, or owe nothing
  // at all — faddere and admins never see a payment prompt.
  //
  // Rendering `null` here is NOT the same as rendering nothing extra: the
  // layout swaps the entire app out for this overlay, so a bare `null` is a
  // blank page. Reaching this branch means the server said "no access" while
  // the status says otherwise, which a reload resolves once the flag that
  // granted access is visible to the layout too.
  if (
    paymentStatus.data?.hasPaid ||
    paymentStatus.data?.isVerified ||
    paymentStatus.data?.isExempt
  ) {
    return (
      <Notice
        title="Betalingen er registrert"
        body="Vi fant betalingen din, men siden ble lastet før tilgangen var på plass. Last inn siden på nytt for å komme videre."
        action={
          <Button
            onClick={() => window.location.reload()}
            className="h-11 w-full text-base"
          >
            Last inn på nytt
          </Button>
        }
      />
    );
  }

  // Status not known yet. Same reasoning as above — this is the whole screen,
  // so it gets a spinner rather than an empty document.
  if (paymentStatus.isLoading) {
    return (
      <Notice
        title="Laster..."
        body="Sjekker betalingsstatusen din."
        action={
          <Loader2 className="text-muted-foreground mx-auto size-6 animate-spin" />
        }
      />
    );
  }

  // The status query failed outright — network, session, or server. Silence
  // here is the same blank page, so say what happened and offer a retry.
  if (paymentStatus.isError) {
    return (
      <Notice
        title="Kunne ikke hente betalingsstatus"
        body="Noe gikk galt da vi sjekket om du er registrert. Prøv igjen, eller ta kontakt med FadderKom hvis det fortsetter."
        action={
          <Button
            onClick={() => void paymentStatus.refetch()}
            className="h-11 w-full text-base"
          >
            Prøv igjen
          </Button>
        }
      />
    );
  }

  return (
    <Notice
      title="Fullfør registreringen"
      body="Du må betale for fadderuka før du kan se innholdet. Betal enkelt med Vipps for å bli registrert som fadderbarn."
      action={
        <>
          <Button
            onClick={() => initiatePayment.mutate()}
            disabled={initiatePayment.isPending}
            className="h-11 w-full text-base"
          >
            {initiatePayment.isPending ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Laster...
              </>
            ) : (
              "Betal med Vipps"
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={() => checkPayment.mutate()}
            disabled={checkPayment.isPending}
            className="h-11 w-full"
          >
            {checkPayment.isPending
              ? "Sjekker betaling..."
              : "Jeg har allerede betalt"}
          </Button>
        </>
      }
    />
  );
}

/**
 * Panelet denne skjermen alltid består av. Overlayet er hele appen for en
 * bruker uten tilgang, så hver tilstand — også «laster» og «noe gikk galt» —
 * må ha noe å vise. Ellers er resultatet en blank side.
 */
function Notice({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: ReactNode;
}) {
  return (
    // `overflow-y-auto` på wrapperen og `my-auto` på panelet: dette er den
    // eneste skjermen en ubetalt bruker ser, og med tastaturet oppe på en liten
    // telefon ble innholdet før klippet uten noen vei til å scrolle.
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 supports-[backdrop-filter]:backdrop-blur-xs">
      <div className="bg-popover text-popover-foreground ring-foreground/10 my-auto flex w-full max-w-md flex-col gap-6 rounded-xl p-6 ring-1 sm:p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-primary/10 grid size-14 place-items-center rounded-full">
            <Wallet className="text-primary size-7" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              {title}
            </h2>
            <p className="text-muted-foreground text-sm text-pretty">{body}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">{action}</div>
      </div>
    </div>
  );
}
