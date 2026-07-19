import { describe, expect, it } from "vitest";

import {
  PAYMENT_AMOUNT_ORE,
  VippsError,
  buildPaymentDescription,
  createPayment,
  fetchPaymentEvents,
  fetchPaymentSnapshot,
  refundPayment,
  settlePayment,
} from "~/server/payment/vipps";

import { createPayment as seedPayment, createUser, db } from "../helpers/db";
import { fetchMock, json, text } from "../helpers/fetch-mock";
import { stubVippsPayment, stubVippsToken, vippsPayment } from "../helpers/vipps";

/**
 * The Vipps layer is the app's money boundary: it decides who gets marked as
 * paid and when money moves. Every test here drives it through a stubbed HTTP
 * layer and asserts on the resulting database state.
 */

describe("settlePayment", () => {
  it("fanger en reservert betaling og markerer brukeren som betalt", async () => {
    const user = await createUser();
    const order = await seedPayment(user.id, { status: "CREATED" });
    stubVippsPayment(
      order.orderId,
      vippsPayment({ state: "AUTHORIZED", authorized: PAYMENT_AMOUNT_ORE }),
    );

    const result = await settlePayment(order.orderId);

    expect(result).toEqual({ paid: true, state: "AUTHORIZED" });
    expect(fetchMock.callsTo(`/epayment/v1/payments/${order.orderId}/capture`)).toHaveLength(1);

    const stored = await db.payment.findUniqueOrThrow({
      where: { orderId: order.orderId },
    });
    expect(stored.status).toBe("CAPTURED");
    expect(stored.capturedAt).toBeInstanceOf(Date);

    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.hasPaid).toBe(true);
    expect(after.isVerified).toBe(true);
  });

  it("fanger ikke på nytt når beløpet allerede er trukket", async () => {
    const user = await createUser();
    const order = await seedPayment(user.id);
    stubVippsPayment(
      order.orderId,
      vippsPayment({
        state: "AUTHORIZED",
        authorized: PAYMENT_AMOUNT_ORE,
        captured: PAYMENT_AMOUNT_ORE,
      }),
    );

    await settlePayment(order.orderId);

    expect(fetchMock.callsTo(`/epayment/v1/payments/${order.orderId}/capture`)).toHaveLength(0);
  });

  it("flytter ikke capturedAt ved gjentatt settle (webhook-retry / admin-sync)", async () => {
    const user = await createUser();
    const order = await seedPayment(user.id);
    stubVippsPayment(
      order.orderId,
      vippsPayment({
        state: "AUTHORIZED",
        authorized: PAYMENT_AMOUNT_ORE,
        captured: PAYMENT_AMOUNT_ORE,
      }),
    );

    await settlePayment(order.orderId);
    const first = await db.payment.findUniqueOrThrow({
      where: { orderId: order.orderId },
    });

    await new Promise((r) => setTimeout(r, 25));
    await settlePayment(order.orderId);
    const second = await db.payment.findUniqueOrThrow({
      where: { orderId: order.orderId },
    });

    expect(second.capturedAt?.getTime()).toBe(first.capturedAt?.getTime());
  });

  it("markerer ingen som betalt når Vipps ikke kjenner referansen", async () => {
    const user = await createUser();
    stubVippsToken();
    fetchMock.on(
      "GET",
      "/epayment/v1/payments/fadderuka-forfalsket-1",
      json({ detail: "Not found" }, 404),
    );

    await expect(settlePayment("fadderuka-forfalsket-1")).rejects.toThrow(VippsError);

    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.hasPaid).toBe(false);
  });

  it("markerer ikke som betalt når betalingen bare er avbrutt", async () => {
    const user = await createUser();
    const order = await seedPayment(user.id);
    stubVippsPayment(order.orderId, vippsPayment({ state: "ABORTED" }));

    const result = await settlePayment(order.orderId);

    expect(result.paid).toBe(false);
    const stored = await db.payment.findUniqueOrThrow({
      where: { orderId: order.orderId },
    });
    expect(stored.status).toBe("ABORTED");
    expect(stored.capturedAt).toBeNull();
    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.hasPaid).toBe(false);
  });

  it("faller tilbake på bruker-id-en i referansen når ordreraden mangler", async () => {
    const user = await createUser();
    const orderId = `fadderuka-${user.id}-${Date.now()}`;
    stubVippsPayment(
      orderId,
      vippsPayment({
        state: "AUTHORIZED",
        authorized: PAYMENT_AMOUNT_ORE,
        captured: PAYMENT_AMOUNT_ORE,
      }),
    );

    await settlePayment(orderId);

    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.hasPaid).toBe(true);
  });

  it("bruker ordreradens userId, ikke id-en i referansen", async () => {
    // Betaleren eier raden; referansen inneholder en annen (eldre) bruker-id.
    const payer = await createUser();
    const other = await createUser();
    const orderId = `fadderuka-${other.id}-${Date.now()}`;
    await seedPayment(payer.id, { orderId });
    stubVippsPayment(
      orderId,
      vippsPayment({
        state: "AUTHORIZED",
        authorized: PAYMENT_AMOUNT_ORE,
        captured: PAYMENT_AMOUNT_ORE,
      }),
    );

    await settlePayment(orderId);

    expect((await db.user.findUniqueOrThrow({ where: { id: payer.id } })).hasPaid).toBe(true);
    expect((await db.user.findUniqueOrThrow({ where: { id: other.id } })).hasPaid).toBe(false);
  });

  it("bruker en idempotensnøkkel på maks 50 tegn ved capture", async () => {
    // Regresjonsvern: en nøkkel utledet av `${orderId}-capture` ville sprengt
    // Vipps' grense og gitt 400.
    const user = await createUser();
    const order = await seedPayment(user.id);
    stubVippsPayment(
      order.orderId,
      vippsPayment({ state: "AUTHORIZED", authorized: PAYMENT_AMOUNT_ORE }),
    );

    await settlePayment(order.orderId);

    const [capture] = fetchMock.callsTo(
      `/epayment/v1/payments/${order.orderId}/capture`,
    );
    const key = capture?.headers["idempotency-key"];
    expect(key).toBeDefined();
    expect(key!.length).toBeLessThanOrEqual(50);
  });

  it("kaster når Vipps avviser capture, og lar brukeren stå som ubetalt", async () => {
    const user = await createUser();
    const order = await seedPayment(user.id);
    stubVippsPayment(
      order.orderId,
      vippsPayment({ state: "AUTHORIZED", authorized: PAYMENT_AMOUNT_ORE }),
      { captureStatus: 400 },
    );

    await expect(settlePayment(order.orderId)).rejects.toThrow(VippsError);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).hasPaid).toBe(false);
  });
});

describe("refusjon", () => {
  it("refunderer hele beløpet og fjerner betalt-statusen", async () => {
    const user = await createUser({ hasPaid: true, isVerified: true });
    const order = await seedPayment(user.id, {
      status: "CAPTURED",
      capturedAt: new Date(),
    });
    stubVippsToken();
    fetchMock.on(
      "GET",
      `/epayment/v1/payments/${order.orderId}`,
      json(
        vippsPayment({
          state: "AUTHORIZED",
          authorized: PAYMENT_AMOUNT_ORE,
          captured: PAYMENT_AMOUNT_ORE,
        }),
      ),
    );
    fetchMock.on("POST", `/epayment/v1/payments/${order.orderId}/refund`, json({}));

    const result = await refundPayment(order.orderId);

    expect(result).toEqual({ refunded: PAYMENT_AMOUNT_ORE });
    const [refund] = fetchMock.callsTo(`/epayment/v1/payments/${order.orderId}/refund`);
    expect(refund?.body).toEqual({
      modificationAmount: { currency: "NOK", value: PAYMENT_AMOUNT_ORE },
    });

    const stored = await db.payment.findUniqueOrThrow({
      where: { orderId: order.orderId },
    });
    expect(stored.status).toBe("REFUNDED");

    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.hasPaid).toBe(false);
    // isVerified styrer tilgang og røres bevisst ikke av en refusjon.
    expect(after.isVerified).toBe(true);
  });

  it("nekter å refundere en betaling som aldri ble trukket", async () => {
    const user = await createUser();
    const order = await seedPayment(user.id, { status: "AUTHORIZED" });
    stubVippsToken();
    fetchMock.on(
      "GET",
      `/epayment/v1/payments/${order.orderId}`,
      json(vippsPayment({ state: "AUTHORIZED", authorized: PAYMENT_AMOUNT_ORE })),
    );

    await expect(refundPayment(order.orderId)).rejects.toThrow(/ikke trukket/i);
    expect(fetchMock.callsTo(`/epayment/v1/payments/${order.orderId}/refund`)).toHaveLength(0);
  });

  it("nekter å refundere to ganger", async () => {
    const user = await createUser({ hasPaid: false });
    const order = await seedPayment(user.id, { status: "REFUNDED" });
    stubVippsToken();
    fetchMock.on(
      "GET",
      `/epayment/v1/payments/${order.orderId}`,
      json(
        vippsPayment({
          state: "AUTHORIZED",
          authorized: PAYMENT_AMOUNT_ORE,
          captured: PAYMENT_AMOUNT_ORE,
          refunded: PAYMENT_AMOUNT_ORE,
        }),
      ),
    );

    await expect(refundPayment(order.orderId)).rejects.toThrow(/allerede refundert/i);
    expect(fetchMock.callsTo(`/epayment/v1/payments/${order.orderId}/refund`)).toHaveLength(0);
  });

  it("forklarer manglende refusjonstilgang når Vipps svarer 403", async () => {
    const user = await createUser({ hasPaid: true });
    const order = await seedPayment(user.id, { status: "CAPTURED" });
    stubVippsToken();
    fetchMock.on(
      "GET",
      `/epayment/v1/payments/${order.orderId}`,
      json(
        vippsPayment({
          state: "AUTHORIZED",
          authorized: PAYMENT_AMOUNT_ORE,
          captured: PAYMENT_AMOUNT_ORE,
        }),
      ),
    );
    fetchMock.on(
      "POST",
      `/epayment/v1/payments/${order.orderId}/refund`,
      text("forbidden", 403),
    );

    await expect(refundPayment(order.orderId)).rejects.toThrow(/refusjonstilgang/i);
    // Pengene flyttet seg ikke, så brukeren skal fortsatt stå som betalt.
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).hasPaid).toBe(true);
  });

  it("lar ikke en senere sync flippe en refundert ordre tilbake til betalt", async () => {
    // Regresjonsvern for rekkefølgen i toStatus: en fullt refundert ordre
    // rapporterer fortsatt et capturedAmount fra Vipps.
    const user = await createUser({ hasPaid: false });
    const order = await seedPayment(user.id, { status: "REFUNDED" });
    stubVippsPayment(
      order.orderId,
      vippsPayment({
        state: "AUTHORIZED",
        authorized: PAYMENT_AMOUNT_ORE,
        captured: PAYMENT_AMOUNT_ORE,
        refunded: PAYMENT_AMOUNT_ORE,
      }),
    );

    const result = await settlePayment(order.orderId);

    expect(result.paid).toBe(false);
    expect(
      (await db.payment.findUniqueOrThrow({ where: { orderId: order.orderId } })).status,
    ).toBe("REFUNDED");
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).hasPaid).toBe(false);
  });
});

describe("createPayment", () => {
  it("sender riktig beløp, referanse og retur-URL, og returnerer redirectUrl", async () => {
    stubVippsToken();
    fetchMock.on(
      "POST",
      "/epayment/v1/payments",
      json({ redirectUrl: "https://vipps.test/checkout/abc" }),
    );

    const result = await createPayment("fadderuka-bruker1-123", {
      paymentDescription: "Ola Nordmann - Fadderuka",
    });

    expect(result.redirectUrl).toBe("https://vipps.test/checkout/abc");
    const [call] = fetchMock.callsTo("/epayment/v1/payments");
    expect(call?.body).toMatchObject({
      amount: { currency: "NOK", value: PAYMENT_AMOUNT_ORE },
      reference: "fadderuka-bruker1-123",
      userFlow: "WEB_REDIRECT",
      paymentDescription: "Ola Nordmann - Fadderuka",
    });
    expect((call?.body as { returnUrl: string }).returnUrl).toContain(
      "orderId=fadderuka-bruker1-123",
    );
    // Uten telefonnummer skal Vipps selv spørre om det i WEB_REDIRECT-flyten.
    expect(call?.body).not.toHaveProperty("customer");
  });

  it("sender telefonnummeret i E.164 når vi har det", async () => {
    stubVippsToken();
    fetchMock.on("POST", "/epayment/v1/payments", json({ redirectUrl: "https://x" }));

    await createPayment("fadderuka-bruker1-123", { phoneNumber: "40404040" });

    const [call] = fetchMock.callsTo("/epayment/v1/payments");
    expect(call?.body).toMatchObject({ customer: { phoneNumber: "4740404040" } });
  });

  it("kaster VippsError når Vipps avviser opprettelsen", async () => {
    stubVippsToken();
    fetchMock.on("POST", "/epayment/v1/payments", text("bad request", 400));

    await expect(createPayment("fadderuka-bruker1-123")).rejects.toThrow(VippsError);
  });

  it("kaster VippsError når tilgangstokenet ikke kan hentes", async () => {
    fetchMock.on("POST", "/accesstoken/get", text("unauthorized", 401));

    await expect(createPayment("fadderuka-bruker1-123")).rejects.toThrow(
      /tilgangstoken/i,
    );
  });
});

describe("buildPaymentDescription", () => {
  it("leder med betalerens navn", () => {
    expect(buildPaymentDescription({ name: "Ola Nordmann" })).toBe(
      "Ola Nordmann - Fadderuka",
    );
  });

  it("faller tilbake til en generisk tekst uten navn", () => {
    expect(buildPaymentDescription()).toBe("Fadderuka - TIHLDE");
    expect(buildPaymentDescription({ name: "   " })).toBe("Fadderuka - TIHLDE");
  });

  it("kutter til Vipps' 100-tegnsgrense", () => {
    expect(buildPaymentDescription({ name: "A".repeat(200) })).toHaveLength(100);
  });
});

describe("admin-innsyn i en betaling", () => {
  it("leser live status fra Vipps", async () => {
    stubVippsToken();
    fetchMock.on(
      "GET",
      "/epayment/v1/payments/ref-1",
      json(
        vippsPayment({
          state: "AUTHORIZED",
          authorized: PAYMENT_AMOUNT_ORE,
          captured: PAYMENT_AMOUNT_ORE,
          refunded: 100,
          cancelled: 0,
        }),
      ),
    );

    await expect(fetchPaymentSnapshot("ref-1")).resolves.toEqual({
      state: "AUTHORIZED",
      authorized: PAYMENT_AMOUNT_ORE,
      captured: PAYMENT_AMOUNT_ORE,
      refunded: 100,
      cancelled: 0,
    });
  });

  it("normaliserer hendelsesloggen på tvers av Vipps' feltnavn", async () => {
    stubVippsToken();
    fetchMock.on(
      "GET",
      "/epayment/v1/payments/ref-1/events",
      json([
        { name: "CREATED", amount: { value: 38_000 }, timestamp: "2026-07-01T10:00:00Z", success: true },
        { paymentAction: "CAPTURE", timeStamp: "2026-07-01T10:05:00Z" },
        {},
      ]),
    );

    await expect(fetchPaymentEvents("ref-1")).resolves.toEqual([
      { action: "CREATED", amount: 38_000, timestamp: "2026-07-01T10:00:00Z", success: true },
      { action: "CAPTURE", amount: null, timestamp: "2026-07-01T10:05:00Z", success: true },
      { action: "UKJENT", amount: null, timestamp: null, success: true },
    ]);
  });
});
