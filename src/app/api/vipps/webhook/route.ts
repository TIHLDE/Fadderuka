import { NextResponse } from "next/server";

import { settlePayment } from "~/server/payment/vipps";

/**
 * Vipps ePayment webhook. Registered separately via the Webhooks API; Vipps
 * POSTs an event whenever a payment changes state (AUTHORIZED, CAPTURED,
 * ABORTED, EXPIRED, …).
 *
 * We do NOT trust the payload's claimed state — we take only the `reference`
 * and re-verify against the Vipps API inside `settlePayment`, which is our
 * security boundary. A forged request therefore can't mark anyone paid: an
 * unknown reference 404s and captures require our own credentials. (HMAC
 * signature validation can be layered on once the webhook secret is provisioned
 * in env, but it isn't required for correctness given the re-verification.)
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    reference?: unknown;
    orderId?: unknown;
  } | null;

  const reference =
    typeof body?.reference === "string"
      ? body.reference
      : typeof body?.orderId === "string"
        ? body.orderId
        : null;

  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  try {
    await settlePayment(reference);
  } catch (err) {
    // A 500 tells Vipps to retry, which is what we want for transient config or
    // network hiccups. Real events carry references Vipps knows about; forged
    // requests don't originate from Vipps, so retrying them is harmless.
    console.error("[vipps/webhook] settle failed for", reference, err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
