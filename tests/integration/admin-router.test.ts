import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { appRouter } from "~/server/api/root";
import { verifyPassword } from "~/server/auth/password";
import { PAYMENT_AMOUNT_ORE } from "~/server/payment/vipps";

import { anonCaller, callerFor } from "../helpers/caller";
import {
  addMember,
  createAdmin,
  createGruppe,
  createPayment as seedPayment,
  createUser,
  db,
} from "../helpers/db";
import { fetchMock, json, text } from "../helpers/fetch-mock";
import { stubVippsPayment, stubVippsToken, vippsPayment } from "../helpers/vipps";

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy(
    (err: unknown) => err instanceof TRPCError && err.code === code,
    `forventet TRPCError med kode ${code}`,
  );
}

/**
 * Every admin procedure, with an input that is valid enough to reach the
 * authorization check. Driven off the router itself, so a newly added procedure
 * that nobody listed here fails the "alle er dekket"-test below.
 */
const ADMIN_PROCEDURE_INPUTS: Record<string, unknown> = {
  getUsers: undefined,
  setUserVerified: { userId: "x", isVerified: true },
  setUserAdmin: { userId: "x", isAdmin: true },
  resetUserPassword: { userId: "x" },
  getGrupper: undefined,
  createGruppe: { name: "Gruppe" },
  updateGruppe: { gruppeId: "x", name: "Gruppe" },
  deleteGruppe: { gruppeId: "x" },
  addMember: { userId: "x", gruppeId: "y", role: "FADDER" },
  removeMember: { membershipId: "x" },
  updateMemberRole: { membershipId: "x", role: "FADDER" },
  deleteUser: { userId: "x" },
  verifyAndAssign: { userId: "x", gruppeId: "y" },
  getRegistrations: undefined,
  getPayments: undefined,
  getPaymentDetails: { orderId: "x" },
  refundPayment: { orderId: "x" },
  syncPayments: undefined,
  getPaymentAmount: undefined,
};

describe("tilgangskontroll på adminProcedure", () => {
  it("dekker alle prosedyrene i admin-routeren", () => {
    // Sikkerhetsnett: en ny adminprosedyre uten oppføring her ville ellers
    // sluppet unna autorisasjonstestene under.
    const declared = Object.keys(appRouter._def.procedures)
      .filter((path) => path.startsWith("admin."))
      .map((path) => path.slice("admin.".length));

    expect(declared.sort()).toEqual(Object.keys(ADMIN_PROCEDURE_INPUTS).sort());
  });

  it.each(Object.entries(ADMIN_PROCEDURE_INPUTS))(
    "admin.%s avviser vanlige brukere og uinnloggede",
    async (name, input) => {
      const user = await createUser();
      const asUser = callerFor(user).admin as unknown as Record<
        string,
        (arg?: unknown) => Promise<unknown>
      >;
      const asAnon = anonCaller().admin as unknown as Record<
        string,
        (arg?: unknown) => Promise<unknown>
      >;

      await expectCode(asUser[name]!(input), "FORBIDDEN");
      await expectCode(asAnon[name]!(input), "UNAUTHORIZED");
      // Ingen av avvisningene skal ha rukket å ringe Vipps.
      expect(fetchMock.calls).toHaveLength(0);
    },
  );
});

describe("admin: brukere og grupper", () => {
  it("verifiserer og avverifiserer brukere", async () => {
    const admin = await createAdmin();
    const user = await createUser();

    await callerFor(admin).admin.setUserVerified({
      userId: user.id,
      isVerified: true,
    });
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).isVerified,
    ).toBe(true);
  });

  it("lager et engangspassord brukeren kan logge inn med", async () => {
    const admin = await createAdmin();
    const user = await createUser({ tihldeUserId: "olanor" });

    const result = await callerFor(admin).admin.resetUserPassword({
      userId: user.id,
    });

    expect(result.tihldeUserId).toBe("olanor");
    expect(result.password).toHaveLength(12);

    // Kun hashen lagres, og den skal matche passordet admin fikk utlevert.
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.passwordHash).not.toContain(result.password);
    await expect(verifyPassword(result.password, stored.passwordHash)).resolves.toBe(
      true,
    );
    // Merket som midlertidig, så brukeren blir bedt om å velge sitt eget.
    expect(stored.passwordIsTemporary).toBe(true);
  });

  it("lager et nytt engangspassord hver gang", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const caller = callerFor(admin);

    const first = await caller.admin.resetUserPassword({ userId: user.id });
    const second = await caller.admin.resetUserPassword({ userId: user.id });

    expect(second.password).not.toBe(first.password);
    // Det forrige passordet skal ikke lenger gjelde.
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    await expect(verifyPassword(first.password, stored.passwordHash)).resolves.toBe(
      false,
    );
  });

  it("nekter å slette verifiserte brukere", async () => {
    const admin = await createAdmin();
    const verified = await createUser({ isVerified: true });

    await expectCode(
      callerFor(admin).admin.deleteUser({ userId: verified.id }),
      "BAD_REQUEST",
    );
    expect(await db.user.count({ where: { id: verified.id } })).toBe(1);
  });

  it("sletter uverifiserte brukere med alle data", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const gruppe = await createGruppe();
    await addMember(user.id, gruppe.id, "FADDERBARN");
    await seedPayment(user.id);

    await callerFor(admin).admin.deleteUser({ userId: user.id });

    expect(await db.user.count({ where: { id: user.id } })).toBe(0);
    expect(await db.payment.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.fadderGruppeMember.count({ where: { userId: user.id } })).toBe(0);
  });

  it("gir NOT_FOUND for en ukjent bruker", async () => {
    const admin = await createAdmin();
    await expectCode(
      callerFor(admin).admin.deleteUser({ userId: "finnes-ikke" }),
      "NOT_FOUND",
    );
  });

  it("avviser dobbelt medlemskap i samme gruppe", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const gruppe = await createGruppe();
    await callerFor(admin).admin.addMember({
      userId: user.id,
      gruppeId: gruppe.id,
      role: "FADDERBARN",
    });

    await expectCode(
      callerFor(admin).admin.addMember({
        userId: user.id,
        gruppeId: gruppe.id,
        role: "FADDER",
      }),
      "CONFLICT",
    );
  });

  it("verifyAndAssign er idempotent og bytter ikke rolle", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const gruppe = await createGruppe();
    await addMember(user.id, gruppe.id, "FADDER");

    await callerFor(admin).admin.verifyAndAssign({
      userId: user.id,
      gruppeId: gruppe.id,
    });

    const memberships = await db.fadderGruppeMember.findMany({
      where: { userId: user.id },
    });
    expect(memberships).toHaveLength(1);
    expect(memberships[0]!.role).toBe("FADDER");
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).isVerified,
    ).toBe(true);
  });

  it("sletter gruppe med medlemskap og meldinger", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const gruppe = await createGruppe();
    await addMember(user.id, gruppe.id, "FADDER");
    await db.groupMessage.create({
      data: { content: "hei", authorId: user.id, gruppeId: gruppe.id },
    });

    await callerFor(admin).admin.deleteGruppe({ gruppeId: gruppe.id });

    expect(await db.fadderGruppe.count()).toBe(0);
    expect(await db.groupMessage.count()).toBe(0);
    expect(await db.fadderGruppeMember.count()).toBe(0);
  });
});

describe("admin.getRegistrations", () => {
  it("teller kun fadderbarn — admins og faddere holdes utenfor", async () => {
    const admin = await createAdmin();
    const gruppe = await createGruppe();
    const fadder = await createUser({ name: "Fadder" });
    await addMember(fadder.id, gruppe.id, "FADDER");
    const fadderbarn = await createUser({ name: "Fadderbarn" });
    await addMember(fadderbarn.id, gruppe.id, "FADDERBARN");
    const utenGruppe = await createUser({ name: "Uten gruppe" });

    const rows = await callerFor(admin).admin.getRegistrations();

    expect(rows.map((r) => r.name).sort()).toEqual(["Fadderbarn", "Uten gruppe"]);
    expect(rows.find((r) => r.id === fadderbarn.id)?.gruppe).toBe(gruppe.name);
    expect(rows.find((r) => r.id === utenGruppe.id)?.gruppe).toBeNull();
  });

  it("rapporterer tidligste capture-tidspunkt og summerer beløpet", async () => {
    const admin = await createAdmin();
    const user = await createUser({ hasPaid: true });
    const first = new Date("2026-07-01T10:00:00Z");
    const second = new Date("2026-07-02T10:00:00Z");
    await seedPayment(user.id, { status: "CAPTURED", capturedAt: second });
    await seedPayment(user.id, { status: "CAPTURED", capturedAt: first });

    const [row] = await callerFor(admin).admin.getRegistrations();

    expect(row?.paidAt?.toISOString()).toBe(first.toISOString());
    expect(row?.amountPaid).toBe(2 * PAYMENT_AMOUNT_ORE);
    expect(row?.paymentStatus).toBe("CAPTURED");
    expect(row?.attemptCount).toBe(2);
  });

  it("faller tilbake til siste forsøk når ingenting er trukket", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    await seedPayment(user.id, {
      status: "ABORTED",
      createdAt: new Date("2026-07-01T10:00:00Z"),
    });
    await seedPayment(user.id, {
      status: "CREATED",
      createdAt: new Date("2026-07-02T10:00:00Z"),
    });

    const [row] = await callerFor(admin).admin.getRegistrations();

    expect(row?.paymentStatus).toBe("CREATED");
    expect(row?.paidAt).toBeNull();
    expect(row?.amountPaid).toBe(0);
  });

  it("teller ikke en refundert betaling som betalt", async () => {
    const admin = await createAdmin();
    const user = await createUser({ hasPaid: false });
    await seedPayment(user.id, {
      status: "REFUNDED",
      capturedAt: new Date("2026-07-01T10:00:00Z"),
    });

    const [row] = await callerFor(admin).admin.getRegistrations();

    expect(row?.paymentStatus).toBe("REFUNDED");
    expect(row?.amountPaid).toBe(0);
    expect(row?.paidAt).toBeNull();
    expect(row?.hasPaid).toBe(false);
  });
});

describe("admin: betalingsoperasjoner mot Vipps", () => {
  it("refunderer en ordre og rapporterer hvem som fikk pengene tilbake", async () => {
    const admin = await createAdmin();
    const user = await createUser({ name: "Ola Nordmann", hasPaid: true });
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
    fetchMock.on("POST", `/epayment/v1/payments/${order.orderId}/refund`, json({}));

    await expect(
      callerFor(admin).admin.refundPayment({ orderId: order.orderId }),
    ).resolves.toEqual({ refunded: PAYMENT_AMOUNT_ORE, name: "Ola Nordmann" });
  });

  it("gir NOT_FOUND for en ukjent referanse uten å kontakte Vipps", async () => {
    const admin = await createAdmin();

    await expectCode(
      callerFor(admin).admin.refundPayment({ orderId: "finnes-ikke" }),
      "NOT_FOUND",
    );
    expect(fetchMock.calls).toHaveLength(0);
  });

  it("gir BAD_GATEWAY når Vipps avviser refusjonen", async () => {
    const admin = await createAdmin();
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
      text("nope", 500),
    );

    await expectCode(
      callerFor(admin).admin.refundPayment({ orderId: order.orderId }),
      "BAD_GATEWAY",
    );
  });

  it("syncPayments teller sjekkede, oppgjorte og feilende ordrer", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const ok = await seedPayment(user.id, {
      status: "AUTHORIZED",
      createdAt: new Date(Date.now() - 60_000),
    });
    const broken = await seedPayment(user.id, { status: "CREATED" });
    // En allerede trukket ordre skal ikke plukkes opp i det hele tatt.
    await seedPayment(user.id, { status: "CAPTURED", capturedAt: new Date() });

    stubVippsPayment(
      ok.orderId,
      vippsPayment({
        state: "AUTHORIZED",
        authorized: PAYMENT_AMOUNT_ORE,
        captured: PAYMENT_AMOUNT_ORE,
      }),
    );
    fetchMock.on("GET", `/epayment/v1/payments/${broken.orderId}`, text("boom", 500));

    await expect(callerFor(admin).admin.syncPayments()).resolves.toEqual({
      checked: 2,
      settled: 1,
      failed: 1,
    });
  });

  it("henter live status og hendelseslogg for én ordre", async () => {
    const admin = await createAdmin();
    stubVippsToken();
    fetchMock.on(
      "GET",
      "/epayment/v1/payments/ref-1",
      json(
        vippsPayment({
          state: "AUTHORIZED",
          authorized: PAYMENT_AMOUNT_ORE,
          captured: PAYMENT_AMOUNT_ORE,
        }),
      ),
    );
    fetchMock.on(
      "GET",
      "/epayment/v1/payments/ref-1/events",
      json([{ name: "CAPTURE", timestamp: "2026-07-01T10:00:00Z" }]),
    );

    const result = await callerFor(admin).admin.getPaymentDetails({
      orderId: "ref-1",
    });

    expect(result.snapshot.captured).toBe(PAYMENT_AMOUNT_ORE);
    expect(result.events).toHaveLength(1);
  });

  it("eksponerer prisen så klienten slipper å hardkode beløpet", async () => {
    const admin = await createAdmin();
    await expect(callerFor(admin).admin.getPaymentAmount()).resolves.toEqual({
      amountOre: PAYMENT_AMOUNT_ORE,
    });
  });
});
