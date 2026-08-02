import { NextResponse } from "next/server";

import { env } from "~/env";
import { settlePayment } from "~/server/payment/vipps";
import {
  verifyVippsWebhookSignature,
  webhookPartsFromRequest,
} from "~/server/payment/webhook-signature";

/**
 * Vipps ePayment webhook. Registered separately via the Webhooks API; Vipps
 * POSTs an event whenever a payment changes state (AUTHORIZED, CAPTURED,
 * ABORTED, EXPIRED, …).
 *
 * Two independent guards, in order:
 *
 *  1. The HMAC signature, when `VIPPS_WEBHOOK_SECRET` is configured. Without it
 *     anyone who knows (or guesses) an order reference can make us capture a
 *     reservation ahead of schedule.
 *  2. Re-verification against the Vipps API inside `settlePayment`. We never
 *     trust the payload's claimed state — only its `reference` — so even a
 *     valid-looking event cannot mark someone paid who has not paid.
 *
 * The secret is optional so the webhook keeps working before it is provisioned;
 * guard 2 alone is what made that safe, and still is.
 */
export async function POST(request: Request) {
  // Read the raw body BEFORE parsing: the signature covers the raw bytes, and
  // a body can only be consumed once.
  const rawBody = await request.text();

  const secret = env.VIPPS_WEBHOOK_SECRET;
  if (secret) {
    const authentic = verifyVippsWebhookSignature(
      webhookPartsFromRequest(request, rawBody),
      secret,
    );
    if (!authentic) {
      console.warn("[vipps/webhook] rejected request with invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const body = (() => {
    try {
      return JSON.parse(rawBody) as {
        reference?: unknown;
        orderId?: unknown;
      };
    } catch {
      return null;
    }
  })();

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
