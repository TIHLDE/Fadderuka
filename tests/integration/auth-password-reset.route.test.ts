import { describe, expect, it, vi } from "vitest";

import { POST as glemtPassord } from "~/app/api/auth/glemt-passord/route";
import { POST as nyttPassord } from "~/app/api/auth/nytt-passord/route";
import { createSession } from "~/server/auth/config";
import { hashPassword, verifyPassword } from "~/server/auth/password";

import { createUser, db } from "../helpers/db";
import { fetchMock, json } from "../helpers/fetch-mock";
import { resetNextHeaders } from "../helpers/next-headers";

vi.mock("next/headers", () => import("../helpers/next-headers"));

const ask = (body: unknown, ip = "10.0.0.1") => {
  resetNextHeaders({ "user-agent": "vitest", "x-forwarded-for": ip });
  return glemtPassord(
    new Request("https://fadderuka.test/api/auth/glemt-passord", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
};

const submit = (body: unknown) =>
  nyttPassord(
    new Request("https://fadderuka.test/api/auth/nytt-passord", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

/** Accept the mail Photon would have sent, and hand back the link it contained. */
function stubPhotonEmail() {
  fetchMock.on("POST", "/api/email/send", json({ success: true }));
}

/** The reset URL out of the mail body we sent to Photon. */
function sentLink(): string {
  const call = fetchMock.callsTo("/api/email/send").at(-1);
  const body = call?.body as
    | { content?: Array<{ type: string; url?: string }> }
    | undefined;
  const button = body?.content?.find((block) => block.type === "button");
  return button?.url ?? "";
}

const tokenFrom = (link: string) => link.split("/nytt-passord/")[1] ?? "";

/** A user of the local login bridge: registered here, TIHLDE not done yet. */
async function pendingUser(password = "gammelt-passord") {
  return createUser({
    tihldeUserId: "ventende",
    email: "ventende@stud.ntnu.no",
    passwordHash: await hashPassword(password),
  });
}

describe("POST /api/auth/glemt-passord", () => {
  it("sender en lenke til brukerens e-post", async () => {
    stubPhotonEmail();
    const user = await pendingUser();

    const response = await ask({ user_id: "ventende" });

    expect(response.status).toBe(200);
    const call = fetchMock.callsTo("/api/email/send").at(-1);
    expect(call?.headers.authorization).toBe("Bearer test-email-api-key");
    expect((call?.body as { to: string }).to).toBe("ventende@stud.ntnu.no");

    // Lenka peker på appen, ikke på verdien i Host-headeren.
    expect(sentLink()).toMatch(/^https:\/\/fadderuka\.test\/nytt-passord\//);

    // Kun hashen lagres — klarteksten finnes bare i e-posten.
    const stored = await db.passwordResetToken.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(stored.tokenHash).not.toContain(tokenFrom(sentLink()));
    expect(stored.usedAt).toBeNull();
  });

  it("tåler brukernavn i feil kasus", async () => {
    stubPhotonEmail();
    const user = await pendingUser();

    await ask({ user_id: "  VENTENDE " });

    expect(await db.passwordResetToken.count({ where: { userId: user.id } })).toBe(1);
  });

  it("sender ingenting til kontoer TIHLDE autentiserer", async () => {
    // Uten lokal hash eier tihlde.org passordet. En lenke herfra ville vært en
    // ekstra vei inn i en godkjent TIHLDE-konto.
    await createUser({ tihldeUserId: "godkjent", email: "godkjent@stud.ntnu.no" });

    const response = await ask({ user_id: "godkjent" });

    expect(response.status).toBe(200);
    expect(fetchMock.callsTo("/api/email/send")).toHaveLength(0);
    expect(await db.passwordResetToken.count()).toBe(0);
  });

  it("røper ikke om brukernavnet finnes", async () => {
    stubPhotonEmail();
    await pendingUser();

    const finnes = await ask({ user_id: "ventende" });
    const finnesIkke = await ask({ user_id: "finnes-ikke" });

    expect(finnesIkke.status).toBe(finnes.status);
    expect(await finnesIkke.json()).toEqual(await finnes.json());
  });

  it("røper ikke at e-postsending feilet", async () => {
    fetchMock.on("POST", "/api/email/send", json({ message: "nei" }, 500));
    await pendingUser();

    const response = await ask({ user_id: "ventende" });

    expect(response.status).toBe(200);
  });

  it("stopper mailbombing av én konto", async () => {
    stubPhotonEmail();
    await pendingUser();

    for (let i = 0; i < 5; i++) {
      expect((await ask({ user_id: "ventende" })).status).toBe(200);
    }
    const blocked = await ask({ user_id: "ventende" });

    expect(blocked.status).toBe(429);
    expect(fetchMock.callsTo("/api/email/send")).toHaveLength(5);
  });

  it("erstatter en tidligere ubrukt lenke", async () => {
    stubPhotonEmail();
    const user = await pendingUser();

    await ask({ user_id: "ventende" });
    const first = tokenFrom(sentLink());
    await ask({ user_id: "ventende" });
    const second = tokenFrom(sentLink());

    expect(second).not.toBe(first);
    expect(await db.passwordResetToken.count({ where: { userId: user.id } })).toBe(1);

    // Den gamle lenka skal være død.
    const response = await submit({ token: first, password: "nytt-passord" });
    expect(response.status).toBe(400);
  });
});

describe("POST /api/auth/nytt-passord", () => {
  it("setter nytt passord og brenner lenka", async () => {
    stubPhotonEmail();
    const user = await pendingUser("gammelt-passord");
    await ask({ user_id: "ventende" });
    const token = tokenFrom(sentLink());

    const response = await submit({ token, password: "mitt-nye-passord" });

    expect(response.status).toBe(200);
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    await expect(
      verifyPassword("mitt-nye-passord", stored.passwordHash),
    ).resolves.toBe(true);
    await expect(
      verifyPassword("gammelt-passord", stored.passwordHash),
    ).resolves.toBe(false);

    // Engangsbruk: samme lenke en gang til gir ingenting.
    const reuse = await submit({ token, password: "enda-et-passord" });
    expect(reuse.status).toBe(400);
    await expect(
      verifyPassword("mitt-nye-passord", stored.passwordHash),
    ).resolves.toBe(true);
  });

  it("logger ut alle økter på kontoen", async () => {
    // Den som ba om tilbakestilling kan være i ferd med å kaste ut noen som
    // sitter innlogget på kontoen akkurat nå.
    stubPhotonEmail();
    const user = await pendingUser();
    await createSession({ userId: user.id, tihldeToken: null });
    expect(await db.session.count({ where: { userId: user.id } })).toBe(1);

    await ask({ user_id: "ventende" });
    await submit({ token: tokenFrom(sentLink()), password: "mitt-nye-passord" });

    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it("avviser en utløpt lenke", async () => {
    stubPhotonEmail();
    const user = await pendingUser("gammelt-passord");
    await ask({ user_id: "ventende" });
    const token = tokenFrom(sentLink());

    await db.passwordResetToken.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const response = await submit({ token, password: "mitt-nye-passord" });

    expect(response.status).toBe(400);
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    await expect(
      verifyPassword("gammelt-passord", stored.passwordHash),
    ).resolves.toBe(true);
  });

  it("avviser et token som ikke finnes", async () => {
    const response = await submit({ token: "finnes-ikke", password: "et-passord-nok" });
    expect(response.status).toBe(400);
  });

  it("krever minst 8 tegn", async () => {
    stubPhotonEmail();
    const user = await pendingUser("gammelt-passord");
    await ask({ user_id: "ventende" });

    const response = await submit({ token: tokenFrom(sentLink()), password: "kort" });

    expect(response.status).toBe(400);
    // Lenka skal fortsatt virke — de skrev bare et for kort passord.
    const stored = await db.passwordResetToken.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(stored.usedAt).toBeNull();
  });
});
