import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as register } from "~/app/api/auth/register/route";
import { SESSION_COOKIE } from "~/server/auth/config";

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
  email: "Ola@stud.ntnu.no",
  user_id: "ola",
  password: "hemmeligpassord",
  study: "dataingenir",
};

/** What Photon answers on a successful `POST /api/user/register`. */
const photonCreated = json(
  {
    id: "photon-user-id",
    username: "ola",
    email: "ola@stud.ntnu.no",
    emailVerificationRequired: true,
  },
  201,
);

beforeEach(() => {
  resetNextHeaders({ "user-agent": "vitest" });
});

describe("POST /api/auth/register", () => {
  it("oppretter TIHLDE-konto på Photon, lokal bruker og sesjon", async () => {
    fetchMock.on("POST", "/api/user/register", photonCreated);

    const response = await post(FORM);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });

    // Brukernavnet velges av studenten og sendes eksplisitt: uten det ville
    // Photon utledet det av e-posten og avvist alt som ikke er @stud.ntnu.no.
    const [call] = fetchMock.callsTo("/api/user/register");
    expect(call?.body).toEqual({
      name: "Ola Nordmann",
      email: "ola@stud.ntnu.no",
      password: FORM.password,
      studyProgramSlug: "dataingenir",
      username: "ola",
    });

    const user = await db.user.findUniqueOrThrow({
      where: { tihldeUserId: "ola" },
    });
    expect(user.studieretning).toBe("Dataingeniør");
    expect(user.hasPaid).toBe(false);
    expect(user.isVerified).toBe(false);
    expect(user.isAdmin).toBe(false);

    // Ingen har logget inn på kontoen ennå, så sesjonen har ikke noe token.
    const session = await db.session.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(session.photonAccessToken).toBeNull();
    expect(lastSetCookie(SESSION_COOKIE)?.value).toBe(session.token);
  });

  // Hele poenget med endringen: den ferske studenten som ikke har fått
  // NTNU-adressen sin ennå skal kunne registrere seg og betale.
  it("godtar privat e-post, siden brukernavnet velges og ikke utledes", async () => {
    fetchMock.on("POST", "/api/user/register", photonCreated);

    const response = await post({ ...FORM, email: "ola@gmail.com" });

    expect(response.status).toBe(200);

    const [call] = fetchMock.callsTo("/api/user/register");
    expect(call?.body).toMatchObject({
      email: "ola@gmail.com",
      username: "ola",
    });

    await expect(
      db.user.findUniqueOrThrow({ where: { tihldeUserId: "ola" } }),
    ).resolves.toMatchObject({ email: "ola@gmail.com" });
  });

  // Broen inn i appen mens TIHLDE-kontoen ikke er brukbar. Uten den kunne de
  // registrere seg og betale, og så bli stengt ute av det de nettopp betalte for.
  it("lagrer et lokalt passord-hash, aldri klarteksten", async () => {
    fetchMock.on("POST", "/api/user/register", photonCreated);

    await post(FORM);

    const user = await db.user.findUniqueOrThrow({
      where: { tihldeUserId: "ola" },
    });
    expect(user.passwordHash).toMatch(/^scrypt:[0-9a-f]+:[0-9a-f]+$/);
    expect(user.passwordHash).not.toContain(FORM.password);
  });

  it("avviser brukernavn med @ og over 15 tegn", async () => {
    for (const user_id of ["ola@stud.ntnu.no", "a".repeat(16)]) {
      const response = await post({ ...FORM, user_id });
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        field: "user_id",
      });
    }
    expect(fetchMock.callsTo("/api/user/register")).toHaveLength(0);
  });

  it("ruller tilbake den lokale raden når Photon avviser", async () => {
    fetchMock.on(
      "POST",
      "/api/user/register",
      json({ message: "E-posten er allerede i bruk" }, 400),
    );

    const response = await post(FORM);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "E-posten er allerede i bruk",
    });

    // Uten tilbakerullingen ville et nytt forsøk truffet duplikatsjekken og
    // fortalt studenten at de allerede er registrert.
    await expect(
      db.user.findUnique({ where: { tihldeUserId: "ola" } }),
    ).resolves.toBeNull();
  });

  it("sender den som allerede er registrert til innlogging", async () => {
    await createUser({ tihldeUserId: "ola", email: "ola@stud.ntnu.no" });

    const response = await post(FORM);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      existingUserId: "ola",
      field: "user_id",
    });
    expect(fetchMock.callsTo("/api/user/register")).toHaveLength(0);
  });

  // Nå som brukernavnet velges igjen, er «e-posten er tatt» og «brukernavnet er
  // tatt» to ulike feil. Å peke på feil felt sender studenten på jakt etter noe
  // som ikke er galt.
  it("peker på e-postfeltet når det er adressen som er tatt", async () => {
    await createUser({ tihldeUserId: "kari", email: "ola@stud.ntnu.no" });

    const response = await post(FORM);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      existingUserId: "kari",
      field: "email",
    });
  });

  it("sier fra når Photon ikke svarer, i stedet for å skylde på skjemaet", async () => {
    fetchMock.on("POST", "/api/user/register", text("bad gateway", 502));

    const response = await post(FORM);

    expect(response.status).toBe(502);
    await expect(
      db.user.findUnique({ where: { tihldeUserId: "ola" } }),
    ).resolves.toBeNull();
  });

  // Photon svarer «Internal server error» når brukernavnet er tatt, men
  // e-posten er ny — altså den som allerede har laget bruker med Feide. Den
  // meldingen ble tidligere vist ordrett i skjemaet, og etterlot studenten uten
  // noe å gjøre.
  it("tilbyr innlogging i stedet for å gjenta Photons «Internal server error»", async () => {
    fetchMock.on(
      "POST",
      "/api/user/register",
      json({ status: 500, message: "Internal server error" }, 500),
    );

    const response = await post(FORM);
    const body = (await response.json()) as {
      error: string;
      existingUserId?: string;
    };

    expect(response.status).toBe(502);
    expect(body.error).not.toContain("Internal server error");
    expect(body.error).toContain("logge inn");
    // Lyser opp innloggingslenken i skjemaet.
    expect(body.existingUserId).toBe("ola");

    await expect(
      db.user.findUnique({ where: { tihldeUserId: "ola" } }),
    ).resolves.toBeNull();
  });

  it("ber studenten vente når Photon ikke er å få tak i", async () => {
    fetchMock.on("POST", "/api/user/register", () => {
      throw new Error("ECONNREFUSED");
    });

    const response = await post(FORM);

    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(body.error).toContain("Får ikke kontakt med TIHLDE");
  });
});
