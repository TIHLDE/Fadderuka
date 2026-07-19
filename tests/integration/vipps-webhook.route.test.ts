import { describe, expect, it } from "vitest";

import { POST as webhook } from "~/app/api/vipps/webhook/route";
import { PAYMENT_AMOUNT_ORE } from "~/server/payment/vipps";

import { createPayment as seedPayment, createUser, db } from "../helpers/db";
import { fetchMock, json, text } from "../helpers/fetch-mock";
import { stubVippsPayment, stubVippsToken, vippsPayment } from "../helpers/vipps";

const post = (body: unknown) =>
  webhook(
    new Request("https://fadderuka.test/api/vipps/webhook", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("POST /api/vipps/webhook", () => {
  it("gjør opp betalingen referansen peker på", async () => {
    const user = await createUser();
    const order = await seedPayment(user.id, { status: "AUTHORIZED" });
    stubVippsPayment(
      order.orderId,
      vippsPayment({ state: "AUTHORIZED", authorized: PAYMENT_AMOUNT_ORE }),
    );

    const response = await post({ reference: order.orderId });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).hasPaid).toBe(true);
  });

  it("godtar også feltnavnet orderId", async () => {
    const user = await createUser();
    const order = await seedPayment(user.id);
    stubVippsPayment(order.orderId, vippsPayment({ state: "ABORTED" }));

    expect((await post({ orderId: order.orderId })).status).toBe(200);
  });

  it("markerer ingen som betalt basert på payloadens egen påstand", async () => {
    // Sikkerhetsgrensen: vi stoler kun på Vipps' eget API, ikke på innholdet i
    // webhooken. En forfalsket "CAPTURED" må ikke gi betalt-status.
    const user = await createUser();
    const order = await seedPayment(user.id);
    stubVippsPayment(order.orderId, vippsPayment({ state: "CREATED" }));

    await post({
      reference: order.orderId,
      state: "CAPTURED",
      aggregate: { capturedAmount: { value: PAYMENT_AMOUNT_ORE } },
    });

    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).hasPaid).toBe(false);
  });

  it("svarer 400 uten referanse", async () => {
    const response = await post({ noe: "annet" });

    expect(response.status).toBe(400);
    expect(fetchMock.calls).toHaveLength(0);
  });

  it("svarer 400 på ugyldig JSON", async () => {
    expect((await post("ikke json")).status).toBe(400);
  });

  it("svarer 500 så Vipps prøver på nytt når oppgjøret feiler", async () => {
    stubVippsToken();
    fetchMock.on("GET", "/epayment/v1/payments/ukjent-ref", text("boom", 500));

    const response = await post({ reference: "ukjent-ref" });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ ok: false });
  });

  it("markerer ingen som betalt for en ukjent referanse", async () => {
    const user = await createUser();
    stubVippsToken();
    fetchMock.on(
      "GET",
      "/epayment/v1/payments/fadderuka-forfalsket-1",
      json({ detail: "Not found" }, 404),
    );

    await post({ reference: "fadderuka-forfalsket-1" });

    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).hasPaid).toBe(false);
  });
});
