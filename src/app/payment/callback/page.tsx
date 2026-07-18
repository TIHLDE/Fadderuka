"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";

function PaymentCallback() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const confirm = api.payment.confirmPayment.useMutation();

  useEffect(() => {
    if (orderId) {
      confirm.mutate({ orderId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (!orderId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-red-400">Ugyldig tilbakekobling fra Vipps.</p>
          <Link href="/" className="mt-4 block text-orange-500 underline">
            Gå til forsiden
          </Link>
        </div>
      </div>
    );
  }

  if (confirm.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <p className="text-red-400">
            Betalingen kunne ikke bekreftes: {confirm.error.message}
          </p>
          <Link href="/" className="block text-orange-500 underline">
            Gå til forsiden
          </Link>
        </div>
      </div>
    );
  }

  if (confirm.isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-8 w-8 text-green-500"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Takk! Du er registrert 🎉
            </h1>
            <p className="text-muted-foreground">
              Betalingen din er bekreftet, og du er nå registrert for Fadderuka.
              Velkommen!
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-orange-500 px-6 text-base font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600"
          >
            Gå til appen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        <p className="text-muted-foreground">Bekrefter betaling med Vipps...</p>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      }
    >
      <PaymentCallback />
    </Suspense>
  );
}
