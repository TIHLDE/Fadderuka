"use client";

import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

/** Sentrert enkeltmelding — samme ramme for alle fire tilstandene. */
function CallbackFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        {children}
      </div>
    </div>
  );
}

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
      <CallbackFrame>
        <p className="text-destructive">Ugyldig tilbakekobling fra Vipps.</p>
        <Button render={<Link href="/">Gå til forsiden</Link>} variant="outline" />
      </CallbackFrame>
    );
  }

  if (confirm.isError) {
    return (
      <CallbackFrame>
        <p className="text-destructive">
          Betalingen kunne ikke bekreftes: {confirm.error.message}
        </p>
        <Button render={<Link href="/">Gå til forsiden</Link>} variant="outline" />
      </CallbackFrame>
    );
  }

  if (confirm.isSuccess) {
    return (
      <CallbackFrame>
        <div className="bg-primary/10 grid size-14 place-items-center rounded-full">
          <Check className="text-primary size-7" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-foreground text-2xl font-semibold tracking-tight">
            Takk! Du er registrert 🎉
          </h1>
          <p className="text-muted-foreground text-pretty">
            Betalingen din er bekreftet, og du er nå registrert for Fadderuka.
            Velkommen!
          </p>
        </div>
        <Button render={<Link href="/">Gå til appen</Link>} className="h-11 w-full text-base" />
      </CallbackFrame>
    );
  }

  return (
    <CallbackFrame>
      <Loader2 className="text-muted-foreground size-8 animate-spin" />
      <p className="text-muted-foreground">Bekrefter betaling med Vipps...</p>
    </CallbackFrame>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <CallbackFrame>
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        </CallbackFrame>
      }
    >
      <PaymentCallback />
    </Suspense>
  );
}
