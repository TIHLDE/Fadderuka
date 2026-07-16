"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";

function PaymentCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const confirm = api.payment.confirmPayment.useMutation({
    onSuccess: () => {
      router.replace("/");
    },
  });

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
