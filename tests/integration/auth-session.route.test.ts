import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as logout } from "~/app/api/auth/logout/route";
import { POST as saveAllergy } from "~/app/api/profile/allergy/route";
import {
  SESSION_COOKIE,
  auth,
  createSession,
  deleteSession,
} from "~/server/auth/config";

import { createUser, db } from "../helpers/db";
import { fetchMock, json, text } from "../helpers/fetch-mock";
import { cookieJar, resetNextHeaders } from "../helpers/next-headers";

vi.mock("next/headers", () => import("../helpers/next-headers"));

beforeEach(() => {
  resetNextHeaders();
});

describe("sesjonslaget", () => {
  it("finner en gyldig sesjon fra cookien", async () => {
    const user = await createUser();
    const { token } = await createSession({ userId: user.id, tihldeToken: "t" });

    const session = await auth.api.getSession({
      headers: new Headers({ cookie: `${SESSION_COOKIE}=${token}; annet=verdi` }),
    });

    expect(session?.user.id).toBe(user.id);
    expect(session?.session.tihldeToken).toBe("t");
  });

  it("gir null uten cookie eller med ukjent token", async () => {
    await expect(auth.api.getSession({ headers: new Headers() })).resolves.toBeNull();
    await expect(
      auth.api.getSession({
        headers: new Headers({ cookie: `${SESSION_COOKIE}=finnes-ikke` }),
      }),
    ).resolves.toBeNull();
  });

  it("avviser og rydder bort en utløpt sesjon", async () => {
    const user = await createUser();
    const { token } = await createSession({ userId: user.id });
    await db.session.update({
      where: { token },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const session = await auth.api.getSession({
      headers: new Headers({ cookie: `${SESSION_COOKIE}=${token}` }),
    });

    expect(session).toBeNull();
    expect(await db.session.count({ where: { token } })).toBe(0);
  });

  it("gir hver sesjon et unikt token", async () => {
    const user = await createUser();
    const a = await createSession({ userId: user.id });
    const b = await createSession({ userId: user.id });

    expect(a.token).not.toBe(b.token);
    expect(a.token).toHaveLength(64);
  });

  it("deleteSession fjerner sesjonen", async () => {
    const user = await createUser();
    const { token } = await createSession({ userId: user.id });

    await deleteSession(token);

    expect(await db.session.count()).toBe(0);
  });
});

describe("POST /api/auth/logout", () => {
  it("sletter sesjonsraden og cookien", async () => {
    const user = await createUser();
    const { token } = await createSession({ userId: user.id });
    cookieJar.seed(SESSION_COOKIE, token);

    const response = await logout();

    expect(response.status).toBe(200);
    expect(await db.session.count()).toBe(0);
    expect(cookieJar.deleted).toContain(SESSION_COOKIE);
  });

  it("er trygg å kalle uten sesjon", async () => {
    const response = await logout();

    expect(response.status).toBe(200);
    expect(cookieJar.deleted).toContain(SESSION_COOKIE);
  });
});

describe("POST /api/profile/allergy", () => {
  const post = (body: unknown) =>
    saveAllergy(
      new Request("https://fadderuka.test/api/profile/allergy", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );

  async function signIn(tihldeToken: string | null) {
    const user = await createUser({ tihldeUserId: "olanor" });
    const { token } = await createSession({ userId: user.id, tihldeToken });
    resetNextHeaders({ cookie: `${SESSION_COOKIE}=${token}` });
    return user;
  }

  it("skriver allergien til TIHLDE når sesjonen har token", async () => {
    await signIn("tihlde-token");
    fetchMock.on("PATCH", "/users/olanor/", json({}));

    const response = await post({ allergy: "Nøtter" });

    await expect(response.json()).resolves.toEqual({ synced: true });
    const [call] = fetchMock.callsTo("/users/olanor/");
    expect(call?.body).toEqual({ allergy: "Nøtter" });
    expect(call?.headers["x-csrf-token"]).toBe("tihlde-token");
  });

  it("ber klienten beholde bufferen når kontoen ikke er aktivert", async () => {
    await signIn(null);

    const response = await post({ allergy: "Nøtter" });

    await expect(response.json()).resolves.toEqual({ synced: false });
    expect(fetchMock.calls).toHaveLength(0);
  });

  it("krever innlogging", async () => {
    resetNextHeaders();

    expect((await post({ allergy: "Nøtter" })).status).toBe(401);
  });

  it("avviser tom allergi", async () => {
    await signIn("tihlde-token");

    expect((await post({ allergy: "  " })).status).toBe(400);
    expect(fetchMock.calls).toHaveLength(0);
  });

  it("videreformidler TIHLDEs statuskode ved feil", async () => {
    await signIn("tihlde-token");
    fetchMock.on("PATCH", "/users/olanor/", text("nope", 403));

    expect((await post({ allergy: "Nøtter" })).status).toBe(403);
  });
});
