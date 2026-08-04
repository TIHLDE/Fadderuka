"use client";

import { Loader2, Wallet } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useToast } from "~/components/ui/use-toast";
import { api } from "~/trpc/react";

export default function VippsPaymentOverlay() {
  const { toast } = useToast();

  const paymentStatus = api.payment.getStatus.useQuery();

  const initiatePayment = api.payment.initiatePayment.useMutation({
    onSuccess: (data) => {
      window.location.href = data.redirectUrl;
    },
    onError: (error) => {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const checkPayment = api.payment.checkMyPayment.useMutation({
    onSuccess: (data) => {
      if (data.found) {
        toast({ title: "Betaling funnet!", description: "Du er nå registrert." });
        void paymentStatus.refetch();
      } else {
        toast({
          title: "Ingen betaling funnet",
          description:
            "Vi fant ingen fullført betaling ennå. Prøv å betale med Vipps.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Nothing to ask for if they've paid, are already verified, or owe nothing
  // at all — faddere and admins never see a payment prompt.
  if (
    paymentStatus.data?.hasPaid ||
    paymentStatus.data?.isVerified ||
    paymentStatus.data?.isExempt
  ) {
    return null;
  }

  // Show loading state while checking status
  if (paymentStatus.isLoading) {
    return null;
  }

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
              Fullfør registreringen
            </h2>
            <p className="text-muted-foreground text-sm text-pretty">
              Du må betale for fadderuka før du kan se innholdet. Betal enkelt
              med Vipps for å bli registrert som fadderbarn.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
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
        </div>
      </div>
    </div>
  );
}
