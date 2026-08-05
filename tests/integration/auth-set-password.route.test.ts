import { describe, expect, it, vi } from "vitest";

import { POST as setPassword } from "~/app/api/auth/set-password/route";
import { SESSION_COOKIE, createSession } from "~/server/auth/config";
import { hashPassword, verifyPassword } from "~/server/auth/password";

import { createUser, db } from "../helpers/db";
import { resetNextHeaders } from "../helpers/next-headers";

vi.mock("next/headers", () => import("../helpers/next-headers"));

const post = (body: unknown) =>
  setPassword(
    new Request("https://fadderuka.test/api/auth/set-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

/**
 * Sign a user in and hand the route the session cookie. The handler reads it
 * through `next/headers`, so it has to go on the mocked request headers rather
 * than on the Request itself.
 */
async function signIn(userId: string, tihldeToken: string | null) {
  resetNextHeaders({ "user-agent": "vitest" });
  const { token } = await createSession({ userId, tihldeToken });
  resetNextHeaders({
    "user-agent": "vitest",
    cookie: `${SESSION_COOKIE}=${token}`,
  });
}

describe("POST /api/auth/set-password", () => {
  it("lar en innlogget bruker uten lokalt passord sette ett", async () => {
    const user = await createUser({ tihldeUserId: "ventende", hasPaid: true });
    await signIn(user.id, null);

    const response = await post({ password: "mitt-nye-passord" });

    expect(response.status).toBe(200);
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    // Kun hashen lagres, og den skal matche det brukeren skrev inn.
    expect(stored.passwordHash).not.toContain("mitt-nye-passord");
    await expect(
      verifyPassword("mitt-nye-passord", stored.passwordHash),
    ).resolves.toBe(true);
  });

  it("avviser uinnloggede", async () => {
    resetNextHeaders({ "user-agent": "vitest" });

    const response = await post({ password: "mitt-nye-passord" });

    expect(response.status).toBe(401);
    expect(await db.user.count({ where: { passwordHash: { not: null } } })).toBe(0);
  });

  it("avviser passord som er for korte", async () => {
    const user = await createUser();
    await signIn(user.id, null);

    const response = await post({ password: "kort" });

    expect(response.status).toBe(400);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash,
    ).toBeNull();
  });

  it("avviser en bruker som allerede har et lokalt passord", async () => {
    // Ellers ville ruta vært en vei til å overskrive passordet uten å kunne det
    // gamle, for den som skulle få tak i en sesjon.
    const user = await createUser({
      passwordHash: await hashPassword("eksisterende-passord"),
    });
    await signIn(user.id, null);

    const response = await post({ password: "overskrevet-passord" });

    expect(response.status).toBe(400);
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    await expect(
      verifyPassword("eksisterende-passord", stored.passwordHash),
    ).resolves.toBe(true);
  });

  it("avviser en bruker som TIHLDE allerede autentiserer", async () => {
    const user = await createUser();
    await signIn(user.id, "tihlde-token");

    const response = await post({ password: "et-lokalt-passord" });

    expect(response.status).toBe(400);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash,
    ).toBeNull();
  });
});
