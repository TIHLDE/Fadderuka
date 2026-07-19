import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "~/app/api/auth/login/route";
import { SESSION_COOKIE } from "~/server/auth/config";

import { createUser, db } from "../helpers/db";
import { fetchMock, json, text } from "../helpers/fetch-mock";
import { lastSetCookie, resetNextHeaders } from "../helpers/next-headers";

vi.mock("next/headers", () => import("../helpers/next-headers"));

const post = (body: unknown) =>
  login(
    new Request("https://fadderuka.test/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

const CREDENTIALS = { user_id: "olanor", password: "hemmelig" };

const PROFILE = {
  user_id: "olanor",
  first_name: "Ola",
  last_name: "Nordmann",
  email: "ola@stud.ntnu.no",
  image: "https://tihlde.test/ola.png",
  study: { group: { name: "Dataingeniør" } },
  studyyear: { group: { name: "2026" } },
};

/** Stub the whole TIHLDE login chain: token, profile, memberships. */
function stubTihldeLogin(opts: {
  memberships?: { group: { slug: string } }[];
} = {}) {
  fetchMock.on("POST", "/auth/login/", json({ token: "tihlde-token" }));
  fetchMock.on("GET", "/users/me/", json(PROFILE));
  fetchMock.on(
    "GET",
    "/users/olanor/memberships/",
    json({ results: opts.memberships ?? [] }),
  );
}

beforeEach(() => {
  resetNextHeaders({ "user-agent": "vitest", "x-forwarded-for": "10.0.0.1, 10.0.0.2" });
});

describe("POST /api/auth/login", () => {
  it("oppretter bruker og sesjon, og setter en httpOnly-cookie", async () => {
    stubTihldeLogin();

    const response = await post(CREDENTIALS);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, verified: false });

    const user = await db.user.findUniqueOrThrow({
      where: { tihldeUserId: "olanor" },
    });
    expect(user.name).toBe("Ola Nordmann");
    expect(user.studieretning).toBe("Dataingeniør");
    expect(user.klasse).toBe("2026");
    expect(user.isAdmin).toBe(false);

    const session = await db.session.findFirstOrThrow({ where: { userId: user.id } });
    expect(session.tihldeToken).toBe("tihlde-token");
    // Kun første ledd av x-forwarded-for skal lagres.
    expect(session.ipAddress).toBe("10.0.0.1");
    expect(session.userAgent).toBe("vitest");

    const cookie = lastSetCookie(SESSION_COOKIE);
    expect(cookie?.value).toBe(session.token);
    expect(cookie?.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });

  it("gjør FadderKom-medlemmer til admin, verifisert og betalt", async () => {
    stubTihldeLogin({ memberships: [{ group: { slug: "fadderkom" } }] });

    await post(CREDENTIALS);

    const user = await db.user.findUniqueOrThrow({
      where: { tihldeUserId: "olanor" },
    });
    expect(user.isAdmin).toBe(true);
    expect(user.isVerified).toBe(true);
    expect(user.hasPaid).toBe(true);
  });

  it("gjør Index-medlemmer til admin", async () => {
    stubTihldeLogin({ memberships: [{ group: { slug: "index" } }] });

    await post(CREDENTIALS);

    expect(
      (await db.user.findUniqueOrThrow({ where: { tihldeUserId: "olanor" } })).isAdmin,
    ).toBe(true);
  });

  it("gjør IKKE medlemmer av andre komiteer til admin", async () => {
    stubTihldeLogin({
      memberships: [{ group: { slug: "sosialen" } }, { group: { slug: "promo" } }],
    });

    await post(CREDENTIALS);

    const user = await db.user.findUniqueOrThrow({
      where: { tihldeUserId: "olanor" },
    });
    expect(user.isAdmin).toBe(false);
    expect(user.hasPaid).toBe(false);
  });

  it("lar et manuelt satt admin-flagg overleve innlogging", async () => {
    await createUser({ tihldeUserId: "olanor", isAdmin: true, adminOverride: true });
    stubTihldeLogin();

    await post(CREDENTIALS);

    const user = await db.user.findUniqueOrThrow({ where: { tihldeUserId: "olanor" } });
    expect(user.isAdmin).toBe(true);
    // Ingen grunn til å spørre TIHLDE når avgjørelsen allerede er tatt manuelt.
    expect(fetchMock.callsTo("/users/olanor/memberships/")).toHaveLength(0);
  });

  it("lar en manuell fratakelse overleve innlogging som FadderKom-medlem", async () => {
    await createUser({ tihldeUserId: "olanor", isAdmin: false, adminOverride: false });
    stubTihldeLogin({ memberships: [{ group: { slug: "fadderkom" } }] });

    await post(CREDENTIALS);

    expect(
      (await db.user.findUniqueOrThrow({ where: { tihldeUserId: "olanor" } })).isAdmin,
    ).toBe(false);
  });

  it("fratar en vanlig innlogging admin-status", async () => {
    await createUser({ tihldeUserId: "olanor", isAdmin: true });
    stubTihldeLogin();

    await post(CREDENTIALS);

    expect(
      (await db.user.findUniqueOrThrow({ where: { tihldeUserId: "olanor" } })).isAdmin,
    ).toBe(false);
  });

  it("beholder eksisterende admin når TIHLDE-oppslaget feiler", async () => {
    await createUser({ tihldeUserId: "olanor", isAdmin: true, isVerified: true });
    fetchMock.on("POST", "/auth/login/", json({ token: "tihlde-token" }));
    fetchMock.on("GET", "/users/me/", json(PROFILE));
    fetchMock.on("GET", "/users/olanor/memberships/", text("boom", 500));

    const response = await post(CREDENTIALS);

    // Innloggingen skal gå igjennom, og admin-flagget stå urørt.
    expect(response.status).toBe(200);
    const user = await db.user.findUniqueOrThrow({ where: { tihldeUserId: "olanor" } });
    expect(user.isAdmin).toBe(true);
  });

  it("beholder betalingsstatusen til en vanlig bruker ved ny innlogging", async () => {
    await createUser({ tihldeUserId: "olanor", hasPaid: true, isVerified: true });
    stubTihldeLogin();

    await post(CREDENTIALS);

    const user = await db.user.findUniqueOrThrow({ where: { tihldeUserId: "olanor" } });
    expect(user.hasPaid).toBe(true);
    expect(user.isVerified).toBe(true);
  });

  it("videreformidler TIHLDEs feilmelding ved feil passord", async () => {
    fetchMock.on(
      "POST",
      "/auth/login/",
      json({ detail: "Brukernavnet eller passordet ditt var feil." }, 401),
    );

    const response = await post(CREDENTIALS);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Brukernavnet eller passordet ditt var feil.",
    });
    expect(await db.session.count()).toBe(0);
  });

  it("gir 502 når TIHLDE svarer med en serverfeil", async () => {
    fetchMock.on("POST", "/auth/login/", text("boom", 500));

    expect((await post(CREDENTIALS)).status).toBe(502);
  });

  it("avviser tomt skjema uten å kontakte TIHLDE", async () => {
    const response = await post({ user_id: "", password: "" });

    expect(response.status).toBe(400);
    expect(fetchMock.calls).toHaveLength(0);
  });
});
