"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { Spinner } from "~/components/ui/spinner";
import { api } from "~/trpc/react";

/** Samme kort for alle fire tilstandene, som i auth-layouten ellers. */
function CallbackFrame({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent>
        <Empty className="p-6">{children}</Empty>
      </CardContent>
    </Card>
  );
}

function Failed({ message }: { message: string }) {
  return (
    <CallbackFrame>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <X className="text-destructive" />
        </EmptyMedia>
        <EmptyTitle>Noe gikk galt</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" render={<Link href="/" />}>
          Gå til forsiden
        </Button>
      </EmptyContent>
    </CallbackFrame>
  );
}

function Pending({ text }: { text?: string }) {
  return (
    <CallbackFrame>
      <EmptyHeader>
        <EmptyMedia>
          <Spinner className="size-6" />
        </EmptyMedia>
        {text ? <EmptyDescription>{text}</EmptyDescription> : null}
      </EmptyHeader>
    </CallbackFrame>
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
    return <Failed message="Ugyldig tilbakekobling fra Vipps." />;
  }

  if (confirm.isError) {
    return (
      <Failed
        message={`Betalingen kunne ikke bekreftes: ${confirm.error.message}`}
      />
    );
  }

  if (confirm.isSuccess) {
    return (
      <CallbackFrame>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Check />
          </EmptyMedia>
          <EmptyTitle>Takk! Du er registrert 🎉</EmptyTitle>
          <EmptyDescription>
            Betalingen din er bekreftet, og du er nå registrert for fadderuka.
            Velkommen!
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button className="w-full" render={<Link href="/" />}>
            Gå til appen
          </Button>
        </EmptyContent>
      </CallbackFrame>
    );
  }

  return <Pending text="Bekrefter betaling med Vipps..." />;
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<Pending />}>
      <PaymentCallback />
    </Suspense>
  );
}
