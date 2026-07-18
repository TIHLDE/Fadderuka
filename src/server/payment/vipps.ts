import "server-only";

import { createHash } from "crypto";

import type { PaymentStatus } from "@prisma/client";

import { env } from "~/env";
import { db } from "~/server/db";

// Vipps ePayment API docs: https://developer.vippsmobilepay.com/docs/APIs/epayment-api/

/** Fadderuka price, in øre (380 NOK). Used for both reserve and capture. */
export const PAYMENT_AMOUNT_ORE = 38_000;

/** Prefix + separator scheme for the Vipps `reference` we mint per payment. */
const ORDER_PREFIX = "fadderuka";

/** Raised for any Vipps-related failure; `message` is safe to show the user. */
export class VippsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VippsError";
  }
}

/** Raised when the server is missing the Vipps credentials it needs. */
export class VippsNotConfiguredError extends VippsError {
  constructor() {
    super("Vipps er ikke konfigurert på serveren");
    this.name = "VippsNotConfiguredError";
  }
}

/**
 * Build the Vipps `reference` for a payment. The owning user id is embedded so
 * the return-URL callback and the webhook can both resolve the payment back to
 * a user. `db.Payment.userId` remains the authoritative link — this is only a
 * fallback for records that predate the row being written.
 */
export function buildOrderId(userId: string): string {
  return `${ORDER_PREFIX}-${userId}-${Date.now()}`;
}

/** Extract the user id embedded in an orderId, or null if it doesn't match. */
export function parseUserIdFromOrderId(orderId: string): string | null {
  const match = /^fadderuka-(.+)-\d+$/.exec(orderId);
  return match?.[1] ?? null;
}

/**
 * Vipps caps the `Idempotency-Key` header at 50 chars. Our `orderId` is already
 * ~49 (`fadderuka-<cuid>-<timestamp>`), so appending anything (e.g. `-capture`)
 * overflows and Vipps rejects the request with 400. Derive a short, stable key
 * from the orderId + operation instead — deterministic, so retries stay
 * idempotent, and always ≤ 50 chars.
 */
function idempotencyKey(orderId: string, operation: string): string {
  const digest = createHash("sha256")
    .update(`${orderId}:${operation}`)
    .digest("hex")
    .slice(0, 40);
  return `${operation}-${digest}`;
}

/** Narrowed view of the Vipps credentials once we've asserted they exist. */
type VippsConfig = {
  apiUrl: string;
  subscriptionKey: string;
  merchantSerialNumber: string;
  clientId: string;
  clientSecret: string;
};

function requireConfig(): VippsConfig {
  const {
    VIPPS_API_URL,
    VIPPS_SUBSCRIPTION_KEY,
    VIPPS_MERCHANT_SERIAL_NUMBER,
    VIPPS_CLIENT_ID,
    VIPPS_CLIENT_SECRET,
  } = env;

  if (
    !VIPPS_API_URL ||
    !VIPPS_SUBSCRIPTION_KEY ||
    !VIPPS_MERCHANT_SERIAL_NUMBER ||
    !VIPPS_CLIENT_ID ||
    !VIPPS_CLIENT_SECRET
  ) {
    throw new VippsNotConfiguredError();
  }

  return {
    apiUrl: VIPPS_API_URL,
    subscriptionKey: VIPPS_SUBSCRIPTION_KEY,
    merchantSerialNumber: VIPPS_MERCHANT_SERIAL_NUMBER,
    clientId: VIPPS_CLIENT_ID,
    clientSecret: VIPPS_CLIENT_SECRET,
  };
}

async function getAccessToken(cfg: VippsConfig): Promise<string> {
  const response = await fetch(`${cfg.apiUrl}/accesstoken/get`, {
    method: "POST",
    headers: {
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      "Ocp-Apim-Subscription-Key": cfg.subscriptionKey,
      "Merchant-Serial-Number": cfg.merchantSerialNumber,
    },
  });

  if (!response.ok) {
    console.error(
      "Vipps access token error:",
      response.status,
      await response.text(),
    );
    throw new VippsError("Kunne ikke hente Vipps tilgangstoken");
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

/** Vipps caps `paymentDescription` at 100 characters. */
const PAYMENT_DESCRIPTION_MAX = 100;

/** Event label appended after the payer's name in the portal description. */
const EVENT_LABEL = "Fadderuka";

/** Default text shown in the Vipps portal when we have no payer name. */
const DEFAULT_PAYMENT_DESCRIPTION = `${EVENT_LABEL} - TIHLDE`;

/**
 * Build the `paymentDescription` shown against a transaction in the Vipps
 * merchant portal. Leading with the payer's name is what lets an admin see
 * *who* paid — the portal otherwise only shows a generic label. Mirrors the
 * "Navn - Arrangement" format TIHLDE uses for other events.
 */
export function buildPaymentDescription(payer?: {
  name?: string | null;
}): string {
  const name = payer?.name?.trim();
  if (!name) return DEFAULT_PAYMENT_DESCRIPTION;
  return `${name} - ${EVENT_LABEL}`.slice(0, PAYMENT_DESCRIPTION_MAX);
}

/**
 * Create a WALLET payment and return the URL to redirect the user to.
 *
 * `phoneNumber` is optional: with the `WEB_REDIRECT` flow Vipps collects the
 * number on its own checkout page, so registration doesn't need to ask for it.
 * When we do have one (e.g. a prefilled retry) we pass it to skip that step.
 *
 * `paymentDescription` is what appears against the transaction in the Vipps
 * portal — pass the payer's details so admins can tell who paid.
 */
export async function createPayment(
  orderId: string,
  opts: { phoneNumber?: string; paymentDescription?: string } = {},
): Promise<{ redirectUrl: string }> {
  const { phoneNumber, paymentDescription } = opts;
  const cfg = requireConfig();

  if (!env.VIPPS_CALLBACK_URL) {
    throw new VippsNotConfiguredError();
  }

  const accessToken = await getAccessToken(cfg);

  const response = await fetch(`${cfg.apiUrl}/epayment/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": cfg.subscriptionKey,
      "Merchant-Serial-Number": cfg.merchantSerialNumber,
      "Idempotency-Key": idempotencyKey(orderId, "create"),
    },
    body: JSON.stringify({
      amount: { currency: "NOK", value: PAYMENT_AMOUNT_ORE },
      paymentMethod: { type: "WALLET" },
      // Include the customer only when we actually have a number; otherwise
      // Vipps prompts for it in the WEB_REDIRECT checkout.
      ...(phoneNumber
        ? { customer: { phoneNumber: `47${phoneNumber}` } } // E.164 format
        : {}),
      reference: orderId,
      returnUrl: `${env.VIPPS_CALLBACK_URL}/payment/callback?orderId=${orderId}`,
      userFlow: "WEB_REDIRECT",
      paymentDescription: paymentDescription ?? DEFAULT_PAYMENT_DESCRIPTION,
    }),
  });

  if (!response.ok) {
    console.error(
      "Vipps create payment error:",
      response.status,
      await response.text(),
    );
    throw new VippsError("Kunne ikke opprette Vipps betaling");
  }

  const data = (await response.json()) as { redirectUrl: string };
  return { redirectUrl: data.redirectUrl };
}

/** Vipps ePayment aggregate amounts; only `value` (øre) matters to us. */
interface VippsPayment {
  state: "CREATED" | "AUTHORIZED" | "TERMINATED" | "ABORTED" | "EXPIRED";
  aggregate: {
    authorizedAmount: { value: number };
    capturedAmount: { value: number };
    refundedAmount: { value: number };
    cancelledAmount: { value: number };
  };
}

async function getPayment(
  cfg: VippsConfig,
  accessToken: string,
  orderId: string,
): Promise<VippsPayment> {
  const response = await fetch(
    `${cfg.apiUrl}/epayment/v1/payments/${orderId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Ocp-Apim-Subscription-Key": cfg.subscriptionKey,
        "Merchant-Serial-Number": cfg.merchantSerialNumber,
      },
    },
  );

  if (!response.ok) {
    console.error(
      "Vipps payment status error:",
      response.status,
      await response.text(),
    );
    throw new VippsError("Kunne ikke hente betalingsstatus fra Vipps");
  }

  return (await response.json()) as VippsPayment;
}

async function capture(
  cfg: VippsConfig,
  accessToken: string,
  orderId: string,
): Promise<void> {
  const response = await fetch(
    `${cfg.apiUrl}/epayment/v1/payments/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": cfg.subscriptionKey,
        "Merchant-Serial-Number": cfg.merchantSerialNumber,
        // A fixed key per order makes retries idempotent on Vipps' side. Derived
        // (not `${orderId}-capture`) so it stays within Vipps' 50-char cap.
        "Idempotency-Key": idempotencyKey(orderId, "capture"),
      },
      body: JSON.stringify({
        modificationAmount: { currency: "NOK", value: PAYMENT_AMOUNT_ORE },
      }),
    },
  );

  if (!response.ok) {
    console.error(
      "Vipps capture error:",
      response.status,
      await response.text(),
    );
    throw new VippsError("Kunne ikke trekke betalingen i Vipps");
  }
}

/** Map a live Vipps payment to our stored status. */
function toStatus(payment: VippsPayment): PaymentStatus {
  if (payment.aggregate.capturedAmount.value >= PAYMENT_AMOUNT_ORE) {
    return "CAPTURED";
  }
  switch (payment.state) {
    case "AUTHORIZED":
      return "AUTHORIZED";
    case "ABORTED":
      return "ABORTED";
    case "EXPIRED":
      return "EXPIRED";
    case "TERMINATED":
      return "TERMINATED";
    default:
      return "CREATED";
  }
}

/**
 * Reconcile a single payment against Vipps — the source of truth — capturing it
 * if it is only reserved, and marking the owning user paid/verified once money
 * is actually captured. Idempotent and safe to call from both the return-URL
 * callback and the webhook. A forged orderId is harmless: Vipps returns 404 for
 * an unknown reference, so no user is ever marked paid without a real capture.
 */
export async function settlePayment(
  orderId: string,
): Promise<{ paid: boolean; state: string }> {
  const cfg = requireConfig();
  const accessToken = await getAccessToken(cfg);

  const payment = await getPayment(cfg, accessToken, orderId);

  // Reserved but not yet captured → capture the full amount now.
  if (
    payment.state === "AUTHORIZED" &&
    payment.aggregate.capturedAmount.value < PAYMENT_AMOUNT_ORE
  ) {
    await capture(cfg, accessToken, orderId);
    payment.aggregate.capturedAmount.value = PAYMENT_AMOUNT_ORE;
  }

  const status = toStatus(payment);
  const paid = status === "CAPTURED";

  // Prefer the authoritative link stored on the order; fall back to the id
  // embedded in the reference for records written before this table existed.
  const order = await db.payment.findUnique({
    where: { orderId },
    select: { userId: true },
  });
  const userId = order?.userId ?? parseUserIdFromOrderId(orderId);

  // No-op when the row is absent (updateMany avoids a P2025 on a missing order).
  await db.payment.updateMany({ where: { orderId }, data: { status } });

  if (paid && userId) {
    await db.user.update({
      where: { id: userId },
      data: { hasPaid: true, isVerified: true },
    });
  }

  return { paid, state: payment.state };
}
