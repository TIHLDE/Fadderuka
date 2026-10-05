"use client";

import { Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Spinner } from "~/components/ui/spinner";
import { authClient } from "~/lib/auth-client";
import { VippsButton } from "~/components/ui/vipps-button";
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
          <Button onClick={() => window.location.reload()} className="w-full">
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
        action={<Spinner className="text-muted-foreground mx-auto size-6" />}
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
            className="w-full"
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
          <VippsButton
            onClick={() => initiatePayment.mutate()}
            loading={initiatePayment.isPending}
            className="w-full"
          />

          <Button
            variant="ghost"
            onClick={() => checkPayment.mutate()}
            disabled={checkPayment.isPending}
            className="w-full"
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
 * Popupen denne skjermen alltid består av (#139). Layouten viser den i stedet
 * for appen for en bruker uten tilgang, så hver tilstand — også «laster» og
 * «noe gikk galt» — må ha noe å vise. Ellers er resultatet en blank side.
 *
 * Den kan ikke lukkes: `open` står fast, klikk utenfor er slått av, og Escape
 * ber bare om å lukke — en forespørsel vi ignorerer. Siden en modal også
 * sperrer headeren, ligger «Logg ut» i selve popupen, så ingen blir sittende
 * fast på feil konto.
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
  const router = useRouter();
  const [loggerUt, setLoggerUt] = useState(false);

  const loggUt = async () => {
    setLoggerUt(true);
    await authClient.signOut();
    router.push("/registrering");
    router.refresh();
  };

  return (
    <Dialog open disablePointerDismissal>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="bg-muted mb-2 flex size-10 items-center justify-center rounded-lg">
            <Wallet className="size-5" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">{action}</div>
        <Button
          variant="link"
          size="sm"
          className="text-muted-foreground mx-auto"
          disabled={loggerUt}
          onClick={() => void loggUt()}
        >
          {loggerUt ? "Logger ut..." : "Logg ut"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
