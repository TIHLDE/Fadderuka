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

    // Photon eier brukernavnet og utleder det fra e-posten, så vi sender bare
    // navn, e-post, passord og linje.
    const [call] = fetchMock.callsTo("/api/user/register");
    expect(call?.body).toEqual({
      name: "Ola Nordmann",
      email: "ola@stud.ntnu.no",
      password: FORM.password,
      studyProgramSlug: "dataingenir",
    });

    // Brukernavnet vi lagrer lokalt er e-postens lokaldel — samme verdi som
    // Photon tildeler, og nøkkelen alle radene her ligger under.
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

  it("krever NTNU-e-post, siden brukernavnet utledes av den", async () => {
    const response = await post({ ...FORM, email: "ola@gmail.com" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ field: "email" });
    // Ingenting skal ha nådd Photon.
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
    });
    expect(fetchMock.callsTo("/api/user/register")).toHaveLength(0);
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
