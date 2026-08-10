import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { PAYMENT_AMOUNT_ORE } from "~/server/payment/vipps";

import { anonCaller, callerFor } from "../helpers/caller";
import { createPayment as seedPayment, createUser, db } from "../helpers/db";
import { fetchMock, json, text } from "../helpers/fetch-mock";
import { stubVippsPayment, stubVippsToken, vippsPayment } from "../helpers/vipps";

/** Assert that a tRPC call rejects with a specific error code. */
async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy(
    (err: unknown) => err instanceof TRPCError && err.code === code,
    `forventet TRPCError med kode ${code}`,
  );
}

describe("payment.getStatus", () => {
  it("speiler brukerens betalings- og verifiseringsstatus", async () => {
    const user = await createUser({ hasPaid: true, isVerified: true });
    await expect(callerFor(user).payment.getStatus()).resolves.toEqual({
      hasPaid: true,
      isVerified: true,
      isExempt: false,
    });
  });

  it("melder fra at faddere er fritatt, så klienten aldri viser betalingsvinduet", async () => {
    const fadder = await createUser({ isFadder: true, isVerified: true });
    await expect(callerFor(fadder).payment.getStatus()).resolves.toMatchObject({
      isExempt: true,
    });
  });

  it("krever innlogging", async () => {
    await expectCode(anonCaller().payment.getStatus(), "UNAUTHORIZED");
  });
});

describe("payment.initiatePayment", () => {
  it("oppretter en ordre og returnerer Vipps' redirect-URL", async () => {
    const user = await createUser({ name: "Ola Nordmann" });
    stubVippsToken();
    fetchMock.on(
      "POST",
      "/epayment/v1/payments",
      json({ redirectUrl: "https://vipps.test/checkout/abc" }),
    );

    const result = await callerFor(user).payment.initiatePayment();

    expect(result.redirectUrl).toBe("https://vipps.test/checkout/abc");

    const order = await db.payment.findFirstOrThrow({ where: { userId: user.id } });
    expect(order.amount).toBe(PAYMENT_AMOUNT_ORE);
    expect(order.status).toBe("CREATED");
    expect(order.orderId).toContain(user.id);

    // Navnet må følge med, ellers ser ikke admin hvem som betalte i Vipps-portalen.
    const [call] = fetchMock.callsTo("/epayment/v1/payments");
    expect(call?.body).toMatchObject({
      paymentDescription: "Ola Nordmann - Fadderuka",
    });
  });

  it("avviser brukere som allerede har betalt", async () => {
    const user = await createUser({ hasPaid: true });
    await expectCode(callerFor(user).payment.initiatePayment(), "BAD_REQUEST");
    expect(await db.payment.count()).toBe(0);
  });

  // Kjernen i "faddere skal ikke betale": å skjule knappen i UI-et holder ikke,
  // for mutasjonen er fortsatt kallbar. Serveren må nekte å ta imot pengene.
  it("nekter å ta betalt av en fadder", async () => {
    const fadder = await createUser({ isFadder: true });

    await expectCode(callerFor(fadder).payment.initiatePayment(), "FORBIDDEN");

    // Ingen ordre opprettet, og Vipps ble aldri kontaktet i det hele tatt.
    expect(await db.payment.count()).toBe(0);
    expect(fetchMock.calls).toHaveLength(0);
  });

  it("nekter å ta betalt av en admin", async () => {
    const admin = await createUser({ isAdmin: true });

    await expectCode(callerFor(admin).payment.initiatePayment(), "FORBIDDEN");
    expect(await db.payment.count()).toBe(0);
  });

  // To faner eller et utålmodig dobbeltklikk ga tidligere to live Vipps-ordrer,
  // og begge kunne trekkes — brukeren betalte dobbelt.
  it("gjenbruker en åpen ordre i stedet for å opprette en ny", async () => {
    const user = await createUser();
    stubVippsToken();
    fetchMock.on(
      "POST",
      "/epayment/v1/payments",
      json({ redirectUrl: "https://vipps.test/checkout/abc" }),
    );

    await callerFor(user).payment.initiatePayment();
    await callerFor(user).payment.initiatePayment();

    const orders = await db.payment.findMany({ where: { userId: user.id } });
    expect(orders).toHaveLength(1);

    // Begge forsøkene må peke på samme Vipps-referanse.
    const references = fetchMock
      .callsTo("/epayment/v1/payments")
      .map((call) => (call.body as { reference: string }).reference);
    expect(references).toEqual([orders[0]!.orderId, orders[0]!.orderId]);
  });

  it("gir BAD_GATEWAY når Vipps svarer med feil", async () => {
    const user = await createUser();
    stubVippsToken();
    fetchMock.on("POST", "/epayment/v1/payments", text("boom", 500));

    await expectCode(callerFor(user).payment.initiatePayment(), "BAD_GATEWAY");
    // Ingen ordre skal lagres når Vipps aldri opprettet betalingen.
    expect(await db.payment.count()).toBe(0);
  });

  it("krever innlogging", async () => {
    await expectCode(anonCaller().payment.initiatePayment(), "UNAUTHORIZED");
  });
});

describe("payment.confirmPayment", () => {
  it("bekrefter en betaling som Vipps rapporterer som trukket", async () => {
    const user = await createUser();
    const orderId = `fadderuka-${user.id}-${Date.now()}`;
    await seedPayment(user.id, { orderId });
    stubVippsPayment(
      orderId,
      vippsPayment({
        state: "AUTHORIZED",
        authorized: PAYMENT_AMOUNT_ORE,
        captured: PAYMENT_AMOUNT_ORE,
      }),
    );

    await expect(
      callerFor(user).payment.confirmPayment({ orderId }),
    ).resolves.toEqual({ success: true });
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).hasPaid).toBe(true);
  });

  it("nekter å bekrefte en annen brukers ordre", async () => {
    const user = await createUser();
    const other = await createUser();
    const orderId = `fadderuka-${other.id}-${Date.now()}`;

    await expectCode(
      callerFor(user).payment.confirmPayment({ orderId }),
      "FORBIDDEN",
    );
    // Sikkerhetsgrensen skal slå til før vi i det hele tatt ringer Vipps.
    expect(fetchMock.calls).toHaveLength(0);
  });

  it("gir BAD_REQUEST når Vipps ikke har trukket betalingen", async () => {
    const user = await createUser();
    const orderId = `fadderuka-${user.id}-${Date.now()}`;
    await seedPayment(user.id, { orderId });
    stubVippsPayment(orderId, vippsPayment({ state: "ABORTED" }));

    await expectCode(
      callerFor(user).payment.confirmPayment({ orderId }),
      "BAD_REQUEST",
    );
  });
});

describe("payment.checkMyPayment", () => {
  it("finner en betaling blant brukerens egne åpne ordrer", async () => {
    const user = await createUser();
    const order = await seedPayment(user.id, { status: "AUTHORIZED" });
    stubVippsPayment(
      order.orderId,
      vippsPayment({
        state: "AUTHORIZED",
        authorized: PAYMENT_AMOUNT_ORE,
        captured: PAYMENT_AMOUNT_ORE,
      }),
    );

    await expect(callerFor(user).payment.checkMyPayment()).resolves.toEqual({
      found: true,
    });
  });

  it("lar én feilende ordre ikke stoppe resten av sjekken", async () => {
    const user = await createUser();
    // Nyeste først i løkka: den feilende sjekkes før den gyldige.
    const good = await seedPayment(user.id, {
      status: "AUTHORIZED",
      createdAt: new Date(Date.now() - 60_000),
    });
    const broken = await seedPayment(user.id, { status: "CREATED" });

    stubVippsToken();
    fetchMock.on("GET", `/epayment/v1/payments/${broken.orderId}`, text("boom", 500));
    fetchMock.on(
      "GET",
      `/epayment/v1/payments/${good.orderId}`,
      json(
        vippsPayment({
          state: "AUTHORIZED",
          authorized: PAYMENT_AMOUNT_ORE,
          captured: PAYMENT_AMOUNT_ORE,
        }),
      ),
    );

    await expect(callerFor(user).payment.checkMyPayment()).resolves.toEqual({
      found: true,
    });
  });

  it("ser ikke på andre brukeres ordrer", async () => {
    const user = await createUser();
    const other = await createUser();
    await seedPayment(other.id, { status: "AUTHORIZED" });

    await expect(callerFor(user).payment.checkMyPayment()).resolves.toEqual({
      found: false,
    });
    expect(fetchMock.calls).toHaveLength(0);
  });
});
