import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as lokalInnlogging } from "~/app/api/auth/lokal-innlogging/route";
import { SESSION_COOKIE } from "~/server/auth/config";
import { hashPassword } from "~/server/auth/password";

import { createUser, db } from "../helpers/db";
import { lastSetCookie, resetNextHeaders } from "../helpers/next-headers";

vi.mock("next/headers", () => import("../helpers/next-headers"));

const PASSORD = "hemmeligpassord";

const post = (body: unknown) =>
  lokalInnlogging(
    new Request("https://fadderuka.test/api/auth/lokal-innlogging", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

/** A student who registered here without an NTNU address. */
async function createPendingStudent(
  overrides: Parameters<typeof createUser>[0] = {},
) {
  return createUser({
    tihldeUserId: "ola",
    email: "ola@gmail.com",
    passwordHash: await hashPassword(PASSORD),
    ...overrides,
  });
}

beforeEach(() => {
  resetNextHeaders({ "user-agent": "vitest" });
});

describe("POST /api/auth/lokal-innlogging", () => {
  it("slipper inn den som registrerte seg uten NTNU-e-post", async () => {
    const user = await createPendingStudent({ isVerified: true, hasPaid: true });

    const response = await post({ user_id: "ola", password: PASSORD });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, verified: true });

    // Ingen har logget inn på TIHLDE-kontoen, så sesjonen bærer ikke noe token.
    const session = await db.session.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(session.photonAccessToken).toBeNull();
    expect(lastSetCookie(SESSION_COOKIE)?.value).toBe(session.token);
  });

  it("godtar brukernavn uansett store og små bokstaver", async () => {
    await createPendingStudent();

    const response = await post({ user_id: "  OLA  ", password: PASSORD });

    expect(response.status).toBe(200);
  });

  it("avviser feil passord uten å opprette sesjon", async () => {
    const user = await createPendingStudent();

    const response = await post({ user_id: "ola", password: "feilpassord" });

    expect(response.status).toBe(401);
    await expect(
      db.session.findFirst({ where: { userId: user.id } }),
    ).resolves.toBeNull();
  });

  /**
   * De tre måtene å mislykkes på må se like ut utenfra. Skiller de seg, kan
   * hvem som helst spørre seg fram til hvem som har registrert seg her.
   */
  it("skiller ikke ukjent bruker fra feil passord fra manglende hash", async () => {
    await createPendingStudent();
    await createUser({ tihldeUserId: "kari", passwordHash: null });

    const svar = await Promise.all([
      post({ user_id: "finnesikke", password: PASSORD }),
      post({ user_id: "ola", password: "feilpassord" }),
      post({ user_id: "kari", password: PASSORD }),
    ]);

    const meldinger = await Promise.all(
      svar.map(async (r) => ((await r.json()) as { error: string }).error),
    );

    expect(svar.map((r) => r.status)).toEqual([401, 401, 401]);
    expect(new Set(meldinger).size).toBe(1);
  });

  /**
   * Brukere som har fått TIHLDE-kontoen aktivert har fått hashen nullstilt i
   * callback-ruten. Da er dette ikke lenger en vei inn for dem.
   */
  it("stenger ute den som har gått over til TIHLDE-innlogging", async () => {
    await createUser({
      tihldeUserId: "aktivert",
      passwordHash: null,
      isVerified: true,
    });

    const response = await post({ user_id: "aktivert", password: PASSORD });

    expect(response.status).toBe(401);
  });

  it("rate-limiter etter gjentatte feil, og nullstiller ved suksess", async () => {
    await createPendingStudent();

    for (let i = 0; i < 10; i++) {
      await post({ user_id: "ola", password: "feilpassord" });
    }

    const blokkert = await post({ user_id: "ola", password: PASSORD });
    expect(blokkert.status).toBe(429);
    expect(blokkert.headers.get("Retry-After")).not.toBeNull();

    // Riktig passord etter at telleren er tømt skal både slippe inn og fjerne
    // resten av forsøkene, så et par skrivefeil aldri henger igjen.
    await db.loginAttempt.deleteMany({});
    const ok = await post({ user_id: "ola", password: PASSORD });
    expect(ok.status).toBe(200);
    await expect(db.loginAttempt.count()).resolves.toBe(0);
  });

  it("krever både brukernavn og passord", async () => {
    const response = await post({ user_id: "ola" });

    expect(response.status).toBe(400);
  });
});
