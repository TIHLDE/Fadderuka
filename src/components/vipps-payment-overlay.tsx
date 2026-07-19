"use client";

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

  // Don't show overlay if user has paid or is verified
  if (paymentStatus.data?.hasPaid || paymentStatus.data?.isVerified) {
    return null;
  }

  // Show loading state while checking status
  if (paymentStatus.isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-8 shadow-2xl sm:p-10">
        {/* Header */}
        <div className="mb-8 text-center m-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-8 w-8 text-orange-500"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mt-8">
            Fullfør registreringen
          </h2>
          <p className="mt-4 text-sm text-zinc-400">
            Du må betale for fadderuka før du kan se innholdet. Betal enkelt med
            Vipps for å bli registrert som fadderbarn.
          </p>
        </div>

        <div className="space-y-4 m-10 mb-12">
          <Button
            onClick={() => initiatePayment.mutate()}
            disabled={initiatePayment.isPending}
            className="h-14 w-full rounded-xl bg-orange-500 text-lg font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600 hover:shadow-orange-500/40 disabled:opacity-50"
          >
            {initiatePayment.isPending ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Laster...
              </span>
            ) : (
              "Betal med Vipps"
            )}
          </Button>

          <button
            onClick={() => checkPayment.mutate()}
            disabled={checkPayment.isPending}
            className="w-full py-2 text-sm text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-200 hover:underline disabled:opacity-50"
          >
            {checkPayment.isPending
              ? "Sjekker betaling..."
              : "Jeg har allerede betalt"}
          </button>
        </div>
      </div>
    </div>
  );
}
