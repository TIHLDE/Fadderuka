import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as callback } from "~/app/api/auth/callback/route";
import { hashPassword, verifyPassword } from "~/server/auth/password";

import { createUser, db } from "../helpers/db";
import { fetchMock, json } from "../helpers/fetch-mock";
import { cookieJar, resetNextHeaders } from "../helpers/next-headers";

vi.mock("next/headers", () => import("../helpers/next-headers"));

const STATE = "teststate";
const VERIFIER = "testverifier";
const PASSORD = "hemmeligpassord";

/** An id token payload, base64url-encoded the way `readIdToken` reads it. */
function idToken(claims: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `header.${payload}.signature`;
}

function stubPhoton(
  overrides: {
    username?: string;
    studyStartYear?: number | null;
    groups?: { slug: string; role: string }[];
  } = {},
) {
  const username = overrides.username ?? "ola";

  fetchMock.on("POST", "/api/auth/oauth2/token", () =>
    json({
      access_token: "photon-access-token",
      id_token: idToken({
        sub: "photon-sub",
        email: "ola@stud.ntnu.no",
        name: "Ola Nordmann",
        preferred_username: username,
      }),
    }),
  );

  // Profilen slås opp på `sub` fra id-tokenet, ikke på brukernavnet.
  fetchMock.on("GET", "/api/user/photon-sub", () =>
    json({
      id: "photon-sub",
      name: "Ola Nordmann",
      username,
      image: null,
      studyProgram: null,
      studyStartYear:
        overrides.studyStartYear === undefined ? 2026 : overrides.studyStartYear,
      groups: overrides.groups ?? [],
    }),
  );
}

const get = () =>
  callback(
    new Request(
      `https://fadderuka.test/api/auth/callback?code=testcode&state=${STATE}`,
    ),
  );

beforeEach(() => {
  resetNextHeaders({ "user-agent": "vitest" });
  cookieJar.seed("fadderuke.oauth_state", STATE);
  cookieJar.seed("fadderuke.oauth_verifier", VERIFIER);
});

describe("GET /api/auth/callback", () => {
  /**
   * The handover. A local password exists only to bridge the gap until TIHLDE
   * will answer for this account — leaving it in place afterwards would keep a
   * second, weaker way into an account that no longer needs one.
   */
  it("nullstiller det lokale passordet ved første TIHLDE-innlogging", async () => {
    const user = await createUser({
      tihldeUserId: "ola",
      passwordHash: await hashPassword(PASSORD),
    });
    stubPhoton();

    await get();

    const etter = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(etter.passwordHash).toBeNull();
    await expect(verifyPassword(PASSORD, etter.passwordHash)).resolves.toBe(
      false,
    );
  });

  /**
   * Studenten som skrev noe annet enn NTNU-brukernavnet sitt i skjemaet. Uten
   * adopsjonen ville de fått en ny rad, og betalingen blitt liggende igjen på
   * den gamle — usynlig for alle andre enn den som leter etter den.
   */
  it("adopterer raden på e-post når brukernavnet ikke stemmer", async () => {
    const gammel = await createUser({
      tihldeUserId: "olanordmann",
      email: "ola@stud.ntnu.no",
      hasPaid: true,
      isFadder: true,
      fadderOverride: true,
      passwordHash: await hashPassword(PASSORD),
    });
    stubPhoton({ username: "ola" });

    await get();

    await expect(db.user.count()).resolves.toBe(1);
    const etter = await db.user.findUniqueOrThrow({ where: { id: gammel.id } });
    expect(etter.tihldeUserId).toBe("ola");
    expect(etter.hasPaid).toBe(true);
    expect(etter.isFadder).toBe(true);
    expect(etter.passwordHash).toBeNull();
  });

  it("lager ny rad når verken brukernavn eller e-post kjennes igjen", async () => {
    await createUser({ tihldeUserId: "kari", email: "kari@stud.ntnu.no" });
    stubPhoton({ username: "ola" });

    await get();

    await expect(db.user.count()).resolves.toBe(2);
    await expect(
      db.user.findUniqueOrThrow({ where: { tihldeUserId: "ola" } }),
    ).resolves.toMatchObject({ name: "Ola Nordmann" });
  });

  it("matcher fortsatt eksisterende brukere på tihldeUserId", async () => {
    const user = await createUser({ tihldeUserId: "ola", name: "Gammelt Navn" });
    stubPhoton();

    await get();

    // Ingen ny rad: den eksisterende ble oppdatert.
    await expect(db.user.count()).resolves.toBe(1);
    await expect(
      db.user.findUniqueOrThrow({ where: { id: user.id } }),
    ).resolves.toMatchObject({ name: "Ola Nordmann", tihldeUserId: "ola" });
  });
});
