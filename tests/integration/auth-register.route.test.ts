import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as register } from "~/app/api/auth/register/route";
import { SESSION_COOKIE } from "~/server/auth/config";
import { verifyPassword } from "~/server/auth/password";

import { createUser, db } from "../helpers/db";
import { fetchMock, json, text } from "../helpers/fetch-mock";
import { lastSetCookie, resetNextHeaders } from "../helpers/next-headers";

vi.mock("next/headers", () => import("../helpers/next-headers"));

const post = (body: unknown) =>
  register(
    new Request("https://fadderuka.test/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

const FORM = {
  full_name: "Ola Nordmann",
  email: "ola@stud.ntnu.no",
  user_id: "OlaNor",
  password: "hemmeligpassord",
  study: "dataingenir",
};

beforeEach(() => {
  resetNextHeaders({ "user-agent": "vitest" });
});

describe("POST /api/auth/register", () => {
  it("oppretter TIHLDE-konto, lokal bruker og sesjon", async () => {
    fetchMock.on("POST", "/users/", json({}, 201));

    const response = await post(FORM);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });

    // Brukernavnet skal sendes i småbokstaver, og navnet splittes for Lepton.
    const [call] = fetchMock.callsTo("/users/");
    expect(call?.body).toMatchObject({
      user_id: "olanor",
      first_name: "Ola",
      last_name: "Nordmann",
      email: "ola@stud.ntnu.no",
      study: "dataingenir",
      class: null,
    });

    const user = await db.user.findUniqueOrThrow({ where: { tihldeUserId: "olanor" } });
    expect(user.studieretning).toBe("Dataingeniør");
    expect(user.hasPaid).toBe(false);
    expect(user.isVerified).toBe(false);
    expect(user.isAdmin).toBe(false);

    // Passordet lagres kun som hash, slik at brukeren kan logge inn igjen før
    // kontoen godkjennes på tihlde.org.
    expect(user.passwordHash).not.toContain(FORM.password);
    await expect(verifyPassword(FORM.password, user.passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("feil-passord", user.passwordHash)).resolves.toBe(false);

    // Kontoen er ikke aktivert ennå, så sesjonen har ikke noe TIHLDE-token.
    const session = await db.session.findFirstOrThrow({ where: { userId: user.id } });
    expect(session.tihldeToken).toBeNull();
    expect(lastSetCookie(SESSION_COOKIE)?.value).toBe(session.token);
  });

  it("bruker fornavnet som etternavn når navnet er ett ord", async () => {
    fetchMock.on("POST", "/users/", json({}, 201));

    await post({ ...FORM, full_name: "Ola" });

    const [call] = fetchMock.callsTo("/users/");
    expect(call?.body).toMatchObject({ first_name: "Ola", last_name: "Ola" });
  });

  it("lagrer aldri passordet lokalt", async () => {
    fetchMock.on("POST", "/users/", json({}, 201));

    await post(FORM);

    const user = await db.user.findUniqueOrThrow({ where: { tihldeUserId: "olanor" } });
    expect(JSON.stringify(user)).not.toContain("hemmeligpassord");
  });

  it("peker på brukernavn-feltet når brukernavnet er opptatt", async () => {
    fetchMock.on("POST", "/users/", json({ detail: { user_id: ["finnes"] } }, 400));

    const response = await post(FORM);

    expect(response.status).toBe(400);
    const body = (await response.json()) as { field?: string; error?: string };
    expect(body.field).toBe("user_id");
    expect(body.error).toContain("Brukernavnet er opptatt");
    expect(await db.user.count()).toBe(0);
  });

  it("peker på e-postfeltet når Lepton klager på e-posten", async () => {
    fetchMock.on(
      "POST",
      "/users/",
      json({ email: ["Ugyldig e-postadresse."] }, 400),
    );

    const response = await post(FORM);

    await expect(response.json()).resolves.toMatchObject({ field: "email" });
  });

  it("gir 502 når Lepton feiler", async () => {
    fetchMock.on("POST", "/users/", text("boom", 500));

    expect((await post(FORM)).status).toBe(502);
  });

  it.each([
    ["for kort passord", { password: "kort" }],
    ["brukernavn med @", { user_id: "ola@stud.ntnu.no" }],
    ["brukernavn over 15 tegn", { user_id: "a".repeat(16) }],
    ["ugyldig e-post", { email: "ikke-en-epost" }],
    ["ukjent linje", { study: "finnes-ikke" }],
    ["tomt navn", { full_name: "   " }],
  ])("avviser %s uten å kontakte TIHLDE", async (_label, override) => {
    const response = await post({ ...FORM, ...override });

    expect(response.status).toBe(400);
    expect(fetchMock.calls).toHaveLength(0);
    expect(await db.user.count()).toBe(0);
  });

  it("oppdaterer en eksisterende lokal bruker i stedet for å duplisere", async () => {
    await createUser({ tihldeUserId: "olanor", name: "Gammelt Navn", email: null });
    fetchMock.on("POST", "/users/", json({}, 201));

    await post(FORM);

    expect(await db.user.count()).toBe(1);
    expect(
      (await db.user.findUniqueOrThrow({ where: { tihldeUserId: "olanor" } })).name,
    ).toBe("Ola Nordmann");
  });
});
