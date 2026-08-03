import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "~/app/api/auth/login/route";
import { SESSION_COOKIE } from "~/server/auth/config";
import { hashPassword } from "~/server/auth/password";
import { decryptToken } from "~/server/auth/token-crypto";

import { addMember, createGruppe, createUser, db } from "../helpers/db";
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
  /** Overrides merged into the default profile, e.g. a different `studyyear`. */
  profile?: Partial<typeof PROFILE>;
} = {}) {
  fetchMock.on("POST", "/auth/login/", json({ token: "tihlde-token" }));
  fetchMock.on("GET", "/users/me/", json({ ...PROFILE, ...opts.profile }));
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
    // TIHLDE-tokenet er en levende nøkkel til brukerens ekte konto, så det
    // skal aldri ligge lesbart i databasen — men må komme uskadd tilbake.
    expect(session.tihldeToken).not.toBe("tihlde-token");
    expect(decryptToken(session.tihldeToken)).toBe("tihlde-token");
    // Kun første ledd av x-forwarded-for skal lagres.
    expect(session.ipAddress).toBe("10.0.0.1");
    expect(session.userAgent).toBe("vitest");

    const cookie = lastSetCookie(SESSION_COOKIE);
    expect(cookie?.value).toBe(session.token);
    expect(cookie?.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });

  it("gjør FadderKom-medlemmer til admin og gir dem tilgang uten å betale", async () => {
    stubTihldeLogin({ memberships: [{ group: { slug: "fadderkom" } }] });

    await post(CREDENTIALS);

    const user = await db.user.findUniqueOrThrow({
      where: { tihldeUserId: "olanor" },
    });
    expect(user.isAdmin).toBe(true);
    expect(user.isVerified).toBe(true);
    // `hasPaid` betyr at penger faktisk har skiftet hender. Å sette det her
    // gjorde at en admin som senere ble degradert så betalt ut for alltid.
    expect(user.hasPaid).toBe(false);
  });

  // Faddere går per definisjon i 2. klasse eller mer, så kullet på
  // TIHLDE-profilen avgjør dette alene — før noen har lagt dem i en gruppe.
  it("fritar en student i 2. klasse eller høyere fra betaling", async () => {
    stubTihldeLogin({ profile: { studyyear: { group: { name: "2025" } } } });

    await post(CREDENTIALS);

    const user = await db.user.findUniqueOrThrow({
      where: { tihldeUserId: "olanor" },
    });
    expect(user.isFadder).toBe(true);
    // Får tilgang med én gang: det kommer ingen betaling som ville verifisert dem.
    expect(user.isVerified).toBe(true);
    expect(user.hasPaid).toBe(false);
  });

  it("lar årets kull betale", async () => {
    stubTihldeLogin({ profile: { studyyear: { group: { name: "2026" } } } });

    await post(CREDENTIALS);

    const user = await db.user.findUniqueOrThrow({
      where: { tihldeUserId: "olanor" },
    });
    expect(user.isFadder).toBe(false);
    expect(user.isVerified).toBe(false);
  });

  // De som begynte på Digital transformasjon rakk å betale før fadder-fritaket
  // gikk live. Uten dette ville neste innlogging gjort dem om til faddere som
  // "har betalt" — og noen kunne refundert dem i god tro.
  it("gjør ikke om en som har betalt til fadder, uansett kull", async () => {
    await createUser({
      tihldeUserId: "olanor",
      email: null,
      hasPaid: true,
      isVerified: true,
    });
    stubTihldeLogin({ profile: { studyyear: { group: { name: "2023" } } } });

    await post(CREDENTIALS);

    const user = await db.user.findUniqueOrThrow({
      where: { tihldeUserId: "olanor" },
    });
    expect(user.isFadder).toBe(false);
    expect(user.hasPaid).toBe(true);
    expect(user.isVerified).toBe(true);
  });

  it("lar en manuell fadder-fritakelse overleve innlogging", async () => {
    await createUser({
      tihldeUserId: "olanor",
      email: null,
      fadderOverride: true,
    });
    // Kullet sier 1. klasse, men admin har bestemt noe annet.
    stubTihldeLogin({ profile: { studyyear: { group: { name: "2026" } } } });

    await post(CREDENTIALS);

    expect(
      (await db.user.findUniqueOrThrow({ where: { tihldeUserId: "olanor" } }))
        .isFadder,
    ).toBe(true);
  });

  it("lar en manuell betalingsplikt overleve innlogging", async () => {
    // 2.-klassingen som faktisk går som fadderbarn.
    await createUser({
      tihldeUserId: "olanor",
      email: null,
      fadderOverride: false,
    });
    stubTihldeLogin({ profile: { studyyear: { group: { name: "2019" } } } });

    await post(CREDENTIALS);

    expect(
      (await db.user.findUniqueOrThrow({ where: { tihldeUserId: "olanor" } }))
        .isFadder,
    ).toBe(false);
  });

  // Digital transformasjon er et 2-årig påbygg: de som begynner har allerede
  // en TIHLDE-bruker fra bacheloren, og profilen der viser fortsatt gammel
  // linje og gammelt kull. Uten at de sier fra leses de som 2. klassing.
  it("gjør en som begynner på nytt studium til fadderbarn, tross gammelt kull", async () => {
    stubTihldeLogin({ profile: { studyyear: { group: { name: "2023" } } } });

    await post({ ...CREDENTIALS, study: "digital-samhandling" });

    const user = await db.user.findUniqueOrThrow({
      where: { tihldeUserId: "olanor" },
    });
    expect(user.isFadder).toBe(false);
    expect(user.fadderOverride).toBe(false);
    expect(user.isVerified).toBe(false);
    expect(user.studieretning).toBe("Digital transformasjon");
    // Kullet fra TIHLDE lagres uendret — det er tolkningen vi overstyrer.
    expect(user.klasse).toBe("2023");
  });

  it("lar det nye studiet overleve neste innlogging", async () => {
    stubTihldeLogin({ profile: { studyyear: { group: { name: "2023" } } } });
    await post({ ...CREDENTIALS, study: "digital-samhandling" });

    // Neste innlogging sender ingen linje, og TIHLDE svarer fortsatt med
    // bacheloren. Uten at valget er pinnet ville de blitt fadder igjen her.
    stubTihldeLogin({ profile: { studyyear: { group: { name: "2023" } } } });
    await post(CREDENTIALS);

    const user = await db.user.findUniqueOrThrow({
      where: { tihldeUserId: "olanor" },
    });
    expect(user.studieretning).toBe("Digital transformasjon");
    expect(user.isFadder).toBe(false);
  });

  it("tar fritaket fra en som allerede var auto-fritatt som fadder", async () => {
    await createUser({
      tihldeUserId: "olanor",
      email: null,
      isFadder: true,
      isVerified: true,
    });
    stubTihldeLogin({ profile: { studyyear: { group: { name: "2023" } } } });

    await post({ ...CREDENTIALS, study: "digital-samhandling" });

    const user = await db.user.findUniqueOrThrow({
      where: { tihldeUserId: "olanor" },
    });
    expect(user.isFadder).toBe(false);
    // Tilgangen kom fra fritaket, så den følger med når fritaket faller bort.
    expect(user.isVerified).toBe(false);
  });

  it("beholder tilgangen til en som faktisk har betalt", async () => {
    await createUser({
      tihldeUserId: "olanor",
      email: null,
      isFadder: true,
      isVerified: true,
      hasPaid: true,
    });
    stubTihldeLogin({ profile: { studyyear: { group: { name: "2023" } } } });

    await post({ ...CREDENTIALS, study: "digital-samhandling" });

    const user = await db.user.findUniqueOrThrow({
      where: { tihldeUserId: "olanor" },
    });
    expect(user.isFadder).toBe(false);
    expect(user.isVerified).toBe(true);
  });

  it("lar ikke en med fadderverv melde seg som fadderbarn", async () => {
    const user = await createUser({ tihldeUserId: "olanor", email: null });
    await addMember(user.id, (await createGruppe()).id, "FADDER");
    stubTihldeLogin({ profile: { studyyear: { group: { name: "2023" } } } });

    await post({ ...CREDENTIALS, study: "digital-samhandling" });

    const after = await db.user.findUniqueOrThrow({
      where: { tihldeUserId: "olanor" },
    });
    expect(after.isFadder).toBe(true);
    expect(after.studieretning).toBe("Dataingeniør");
  });

  it("avviser en ukjent linje i stedet for å logge inn", async () => {
    stubTihldeLogin();

    const response = await post({ ...CREDENTIALS, study: "finnes-ikke" });

    expect(response.status).toBe(400);
    expect(await db.user.count()).toBe(0);
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

  it("slipper inn en betalende bruker som ikke er godkjent på tihlde.org ennå", async () => {
    // Lepton avviser kontoer som venter på godkjenning – da faller vi tilbake
    // på passordet brukeren satte under registreringen her.
    await createUser({
      tihldeUserId: "olanor",
      hasPaid: true,
      isVerified: true,
      passwordHash: await hashPassword(CREDENTIALS.password),
    });
    fetchMock.on("POST", "/auth/login/", json({ detail: "Ikke aktivert." }, 401));

    const response = await post(CREDENTIALS);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, verified: true });

    const user = await db.user.findUniqueOrThrow({ where: { tihldeUserId: "olanor" } });
    const session = await db.session.findFirstOrThrow({ where: { userId: user.id } });
    // Ingen TIHLDE-token finnes for en konto som ikke er aktivert.
    expect(session.tihldeToken).toBeNull();
    expect(lastSetCookie(SESSION_COOKIE)?.value).toBe(session.token);
  });

  it("avviser feil passord selv om brukeren har et lokalt passord", async () => {
    await createUser({
      tihldeUserId: "olanor",
      passwordHash: await hashPassword("et-annet-passord"),
    });
    fetchMock.on("POST", "/auth/login/", json({ detail: "Feil passord." }, 401));

    const response = await post(CREDENTIALS);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Feil passord." });
    expect(await db.session.count()).toBe(0);
  });

  it("sletter det lokale passordet når TIHLDE-innlogging først lykkes", async () => {
    await createUser({
      tihldeUserId: "olanor",
      passwordHash: await hashPassword(CREDENTIALS.password),
    });
    stubTihldeLogin();

    expect((await post(CREDENTIALS)).status).toBe(200);

    const user = await db.user.findUniqueOrThrow({ where: { tihldeUserId: "olanor" } });
    expect(user.passwordHash).toBeNull();
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

  it("sier at TIHLDE er nede når kallet ikke går gjennom", async () => {
    fetchMock.on("POST", "/auth/login/", () => {
      throw new TypeError("fetch failed");
    });

    const response = await post(CREDENTIALS);
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(503);
    expect(body.error).toContain("ikke noe galt med det du fylte inn");
  });

  // Det lokale passordet finnes nettopp for å holde folk inne når TIHLDE ikke
  // svarer — da skal det også brukes, ikke bare når Lepton sier 401.
  it("slipper inn på lokalt passord når TIHLDE er utilgjengelig", async () => {
    await createUser({
      tihldeUserId: "olanor",
      email: null,
      passwordHash: await hashPassword(CREDENTIALS.password),
    });
    fetchMock.on("POST", "/auth/login/", () => {
      throw new TypeError("fetch failed");
    });

    const response = await post(CREDENTIALS);

    expect(response.status).toBe(200);
    expect(lastSetCookie(SESSION_COOKIE)?.value).toBeTruthy();
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
