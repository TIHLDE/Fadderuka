"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { useToast } from "~/components/ui/use-toast";
import { api } from "~/trpc/react";

export default function VippsPaymentOverlay() {
  const [showPhoneCheck, setShowPhoneCheck] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const { toast } = useToast();

  const paymentStatus = api.payment.getStatus.useQuery();

  const initiatePayment = api.payment.initiatePayment.useMutation({
    onSuccess: (data) => {
      // TODO: When Vipps is configured, this will redirect to Vipps checkout
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

  const checkPayment = api.payment.checkPaymentByPhone.useMutation({
    onSuccess: (data) => {
      if (data.found) {
        toast({ title: "Betaling funnet!", description: "Du er nå registrert." });
        paymentStatus.refetch();
      } else {
        toast({
          title: "Ingen betaling funnet",
          description:
            "Vi fant ingen registrert betaling for dette nummeret. Prøv å betal med Vipps.",
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

  function validatePhone(value: string): boolean {
    if (!/^\d{8}$/.test(value)) {
      setPhoneError("Telefonnummeret må være 8 siffer");
      return false;
    }
    setPhoneError("");
    return true;
  }

  function handlePayWithVipps() {
    if (!validatePhone(paymentPhone)) return;
    initiatePayment.mutate({ phoneNumber: paymentPhone });
  }

  function handleCheckPayment() {
    if (!validatePhone(phoneNumber)) return;
    checkPayment.mutate({ phoneNumber });
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
          <h2 className="text-2xl font-bold text-white mt-8">Betal for Fadderuka</h2>
          <p className="mt-4 text-sm text-zinc-400">
            Du må betale for fadderuka før du kan se innholdet. Betal enkelt med
            Vipps for å bli registrert som fadderbarn.
          </p>
        </div>

        {/* Pay with Vipps section */}
        {!showPhoneCheck ? (
          <div className="space-y-4 m-10 mb-12">
            <div>
              <label
                htmlFor="payment-phone"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Telefonnummer
              </label>
              <input
                id="payment-phone"
                type="tel"
                inputMode="numeric"
                placeholder="12345678"
                maxLength={8}
                value={paymentPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setPaymentPhone(val);
                  if (phoneError) setPhoneError("");
                }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3! py-2.5! text-white placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              {phoneError && (
                <p className="mt-1 text-sm text-red-400">{phoneError}</p>
              )}
            </div>

            <Button
              onClick={handlePayWithVipps}
              disabled={initiatePayment.isPending || paymentPhone.length !== 8}
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
              onClick={() => setShowPhoneCheck(true)}
              className="w-full py-2 text-sm text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-200 hover:underline"
            >
              Jeg har allerede betalt
            </button>
          </div>
        ) : (
          /* Already paid - phone check section */
          <div className="space-y-4 m-10 mb-12">
            <p className="text-sm text-zinc-400">
              Skriv inn telefonnummeret du betalte med, så sjekker vi om
              betalingen er registrert.
            </p>

            <div>
              <label
                htmlFor="check-phone"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Telefonnummer
              </label>
              <input
                id="check-phone"
                type="tel"
                inputMode="numeric"
                placeholder="12345678"
                maxLength={8}
                value={phoneNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setPhoneNumber(val);
                  if (phoneError) setPhoneError("");
                }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3! py-2.5! text-white placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              {phoneError && (
                <p className="mt-1 text-sm text-red-400">{phoneError}</p>
              )}
            </div>

            <Button
              onClick={handleCheckPayment}
              disabled={checkPayment.isPending || phoneNumber.length !== 8}
              className="h-12 w-full rounded-xl bg-zinc-700 font-semibold text-white transition-colors hover:bg-zinc-600 disabled:opacity-50"
            >
              {checkPayment.isPending ? (
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
                  Sjekker...
                </span>
              ) : (
                "Sjekk betaling"
              )}
            </Button>

            <button
              onClick={() => {
                setShowPhoneCheck(false);
                setPhoneError("");
              }}
              className="w-full py-2 text-sm text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-200 hover:underline"
            >
              Tilbake til betaling
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
