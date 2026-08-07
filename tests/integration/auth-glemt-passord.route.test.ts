import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as glemtPassord } from "~/app/api/auth/glemt-passord/route";
import { POST as nyttPassord } from "~/app/api/auth/nytt-passord/route";
import { POST as lokalInnlogging } from "~/app/api/auth/lokal-innlogging/route";
import {
  RESET_REQUIRED,
  hashPassword,
  verifyPassword,
} from "~/server/auth/password";
import { hashToken } from "~/server/auth/password-reset";

import { createUser, db } from "../helpers/db";
import { fetchMock, json } from "../helpers/fetch-mock";
import { resetNextHeaders } from "../helpers/next-headers";

vi.mock("next/headers", () => import("../helpers/next-headers"));

const post = (
  handler: (request: Request) => Promise<Response>,
  path: string,
  body: unknown,
) =>
  handler(
    new Request(`https://fadderuka.test${path}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

const askFor = (user_id: string) =>
  post(glemtPassord, "/api/auth/glemt-passord", { user_id });

/** Photon's mail endpoint, which `sendResetEmail` goes through. */
function stubEmail() {
  fetchMock.on("POST", /\/api\/email/, () => json({ ok: true }));
}

/** The plaintext token out of the mail we just "sent". */
function sentToken(): string | undefined {
  const [call] = fetchMock.callsTo(/\/api\/email/);
  const body = JSON.stringify(call?.body ?? {});
  return /nytt-passord\/([A-Za-z0-9_-]+)/.exec(body)?.[1];
}

beforeEach(() => {
  resetNextHeaders({ "user-agent": "vitest" });
  stubEmail();
});

describe("POST /api/auth/glemt-passord", () => {
  it("sender lenke til den som må sette nytt passord etter cutoveren", async () => {
    await createUser({
      tihldeUserId: "ola",
      email: "ola@gmail.com",
      passwordHash: RESET_REQUIRED,
    });

    const response = await askFor("ola");

    expect(response.status).toBe(200);
    expect(fetchMock.callsTo(/\/api\/email/)).toHaveLength(1);
    await expect(db.passwordResetToken.count()).resolves.toBe(1);
  });

  it("finner brukeren på e-post òg, ikke bare brukernavn", async () => {
    await createUser({
      tihldeUserId: "ola",
      email: "ola@gmail.com",
      passwordHash: RESET_REQUIRED,
    });

    const response = await askFor("OLA@GMAIL.COM");

    expect(response.status).toBe(200);
    await expect(db.passwordResetToken.count()).resolves.toBe(1);
  });

  /**
   * Kontoer TIHLDE autentiserer har `passwordHash = null`. Å la en e-postlenke
   * mynte et lokalt passord for dem ville vært en andre vei inn i en godkjent
   * TIHLDE-konto, utenom TIHLDE.
   */
  it("sender ikke lenke til en konto TIHLDE eier", async () => {
    await createUser({
      tihldeUserId: "kari",
      email: "kari@stud.ntnu.no",
      passwordHash: null,
    });

    const response = await askFor("kari");

    expect(response.status).toBe(200);
    expect(fetchMock.callsTo(/\/api\/email/)).toHaveLength(0);
    await expect(db.passwordResetToken.count()).resolves.toBe(0);
  });

  it("svarer likt enten kontoen finnes, mangler lokalt passord eller fikk mail", async () => {
    await createUser({
      tihldeUserId: "ola",
      email: "ola@gmail.com",
      passwordHash: RESET_REQUIRED,
    });
    await createUser({
      tihldeUserId: "kari",
      email: "kari@stud.ntnu.no",
      passwordHash: null,
    });

    const svar = [
      await askFor("ola"),
      await askFor("kari"),
      await askFor("finnesikke"),
    ];
    const kropper = await Promise.all(svar.map((r) => r.json()));

    expect(svar.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(new Set(kropper.map((b) => JSON.stringify(b))).size).toBe(1);
  });

  it("rate-limiter gjentatte forespørsler for samme konto", async () => {
    await createUser({
      tihldeUserId: "ola",
      email: "ola@gmail.com",
      passwordHash: RESET_REQUIRED,
    });

    for (let i = 0; i < 5; i++) await askFor("ola");
    const blokkert = await askFor("ola");

    expect(blokkert.status).toBe(429);
  });
});

describe("POST /api/auth/nytt-passord", () => {
  async function requestLink() {
    const user = await createUser({
      tihldeUserId: "ola",
      email: "ola@gmail.com",
      passwordHash: RESET_REQUIRED,
    });
    await askFor("ola");
    const token = sentToken();
    expect(token).toBeDefined();
    return { user, token: token! };
  }

  it("setter nytt passord, som deretter virker på lokal innlogging", async () => {
    const { token } = await requestLink();

    const response = await post(nyttPassord, "/api/auth/nytt-passord", {
      token,
      password: "mittnyepassord",
    });
    expect(response.status).toBe(200);

    const innlogging = await lokalInnlogging(
      new Request("https://fadderuka.test/api/auth/lokal-innlogging", {
        method: "POST",
        body: JSON.stringify({ user_id: "ola", password: "mittnyepassord" }),
      }),
    );
    expect(innlogging.status).toBe(200);
  });

  it("lagrer en ekte hash, ikke sentinelen eller klarteksten", async () => {
    const { user, token } = await requestLink();

    await post(nyttPassord, "/api/auth/nytt-passord", {
      token,
      password: "mittnyepassord",
    });

    const etter = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(etter.passwordHash).not.toBe(RESET_REQUIRED);
    expect(etter.passwordHash).not.toContain("mittnyepassord");
    await expect(
      verifyPassword("mittnyepassord", etter.passwordHash),
    ).resolves.toBe(true);
  });

  it("brenner lenka, så den ikke kan brukes to ganger", async () => {
    const { token } = await requestLink();

    const første = await post(nyttPassord, "/api/auth/nytt-passord", {
      token,
      password: "mittnyepassord",
    });
    const andre = await post(nyttPassord, "/api/auth/nytt-passord", {
      token,
      password: "enda-et-passord",
    });

    expect(første.status).toBe(200);
    expect(andre.status).toBe(400);
  });

  /**
   * Den som ber om reset kan være i ferd med å låse ute noen som sitter
   * innlogget på kontoen akkurat nå. Det er hele poenget med et passordbytte.
   */
  it("logger ut alle eksisterende sesjoner", async () => {
    const { user, token } = await requestLink();
    await db.session.create({
      data: {
        token: "gammel-sesjon",
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await post(nyttPassord, "/api/auth/nytt-passord", {
      token,
      password: "mittnyepassord",
    });

    await expect(
      db.session.count({ where: { userId: user.id } }),
    ).resolves.toBe(0);
  });

  it("avviser en utløpt lenke", async () => {
    const user = await createUser({
      tihldeUserId: "ola",
      passwordHash: RESET_REQUIRED,
    });
    await db.passwordResetToken.create({
      data: {
        tokenHash: hashToken("utloept"),
        userId: user.id,
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const response = await post(nyttPassord, "/api/auth/nytt-passord", {
      token: "utloept",
      password: "mittnyepassord",
    });

    expect(response.status).toBe(400);
    const etter = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(etter.passwordHash).toBe(RESET_REQUIRED);
  });

  it("avviser et ukjent token", async () => {
    const response = await post(nyttPassord, "/api/auth/nytt-passord", {
      token: "finnes-ikke",
      password: "mittnyepassord",
    });

    expect(response.status).toBe(400);
  });
});

describe("RESET_REQUIRED", () => {
  it("kan aldri brukes som passord", async () => {
    await expect(verifyPassword(RESET_REQUIRED, RESET_REQUIRED)).resolves.toBe(
      false,
    );
    await expect(verifyPassword("", RESET_REQUIRED)).resolves.toBe(false);
    // Og et ekte passord virker fortsatt, så sentinelen ikke har ødelagt noe.
    const hash = await hashPassword("hemmeligpassord");
    await expect(verifyPassword("hemmeligpassord", hash)).resolves.toBe(true);
  });
});
