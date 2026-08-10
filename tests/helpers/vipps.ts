import { PAYMENT_AMOUNT_ORE } from "~/server/payment/vipps";

import { fetchMock, json } from "./fetch-mock";

/**
 * Canned Vipps ePayment responses.
 *
 * Every Vipps call starts with an access-token request, so `stubVipps()` always
 * registers that leg — a test that forgets it would fail on the token call
 * rather than on the behaviour it means to check.
 */

export const ORE = PAYMENT_AMOUNT_ORE;

export type VippsState =
  | "CREATED"
  | "AUTHORIZED"
  | "TERMINATED"
  | "ABORTED"
  | "EXPIRED";

/** Build the `GET /epayment/v1/payments/{ref}` body Vipps returns. */
export function vippsPayment(opts: {
  state: VippsState;
  authorized?: number;
  captured?: number;
  refunded?: number;
  cancelled?: number;
}) {
  return {
    state: opts.state,
    aggregate: {
      authorizedAmount: { value: opts.authorized ?? 0 },
      capturedAmount: { value: opts.captured ?? 0 },
      refundedAmount: { value: opts.refunded ?? 0 },
      cancelledAmount: { value: opts.cancelled ?? 0 },
    },
  };
}

/** Register the access-token leg. Safe to call more than once per test. */
export function stubVippsToken(): void {
  fetchMock.on("POST", "/accesstoken/get", json({ access_token: "vipps-token" }));
}

/**
 * Stub a full settle flow for one order: token, status lookup and capture.
 * `capture` defaults to succeeding.
 */
export function stubVippsPayment(
  orderId: string,
  payment: ReturnType<typeof vippsPayment>,
  opts: { captureStatus?: number } = {},
): void {
  stubVippsToken();
  fetchMock.on("GET", `/epayment/v1/payments/${orderId}`, json(payment));
  fetchMock.on(
    "POST",
    `/epayment/v1/payments/${orderId}/capture`,
    opts.captureStatus && opts.captureStatus >= 400
      ? json({ detail: "nope" }, opts.captureStatus)
      : json({ ok: true }),
  );
}
