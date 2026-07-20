import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "~/app/api/auth/login/route";
import { hashPassword } from "~/server/auth/password";

import { createUser, db } from "../helpers/db";
import { fetchMock, json } from "../helpers/fetch-mock";
import { resetNextHeaders } from "../helpers/next-headers";

vi.mock("next/headers", () => import("../helpers/next-headers"));

const post = (body: unknown) =>
  login(
    new Request("https://fadderuka.test/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

const CREDENTIALS = { user_id: "olanor", password: "hemmelig" };

/** TIHLDE says no — the shape every brute-force attempt takes. */
function stubTihldeRejection() {
  fetchMock.on("POST", "/auth/login/", json({ detail: "Feil passord." }, 401));
}

/** Fire `n` failing attempts and return the status of each. */
async function attempt(n: number, body: unknown = CREDENTIALS) {
  const statuses: number[] = [];
  for (let i = 0; i < n; i++) statuses.push((await post(body)).status);
  return statuses;
}

beforeEach(() => {
  resetNextHeaders({ "user-agent": "vitest", "x-forwarded-for": "10.0.0.1" });
});

describe("rate limiting på /api/auth/login", () => {
  it("stenger et brukernavn ute etter 10 mislykkede forsøk", async () => {
    stubTihldeRejection();

    const statuses = await attempt(11);

    // De ti første slipper gjennom til TIHLDE og avvises der; det ellevte
    // stoppes av oss.
    expect(statuses.slice(0, 10)).toEqual(Array<number>(10).fill(401));
    expect(statuses[10]).toBe(429);
  });

  it("svarer 429 uten å kontakte TIHLDE", async () => {
    stubTihldeRejection();
    await attempt(10);
    const callsBefore = fetchMock.calls.length;

    const response = await post(CREDENTIALS);

    expect(response.status).toBe(429);
    // Et blokkert forsøk skal ikke koste Lepton en runde.
    expect(fetchMock.calls.length).toBe(callsBefore);
    expect(response.headers.get("Retry-After")).toBeTruthy();
  });

  it("gir samme svar for et brukernavn som ikke finnes", async () => {
    // Ellers ville 429-en røpet hvilke brukernavn som er ekte.
    stubTihldeRejection();
    await attempt(10, { user_id: "finnes-ikke", password: "x" });

    const response = await post({ user_id: "finnes-ikke", password: "x" });

    expect(response.status).toBe(429);
  });

  it("nullstiller telleren når brukeren treffer riktig passord", async () => {
    await createUser({
      tihldeUserId: "olanor",
      passwordHash: await hashPassword(CREDENTIALS.password),
    });
    stubTihldeRejection();

    // Ni bomskudd, så riktig passord via den lokale broen.
    await attempt(9, { user_id: "olanor", password: "feil-passord" });
    expect((await post(CREDENTIALS)).status).toBe(200);

    // Telleren skal være tom, så neste bom starter på nytt.
    expect(await db.loginAttempt.count()).toBe(0);
    expect((await post({ user_id: "olanor", password: "feil" })).status).toBe(401);
  });

  it("stenger en IP ute på tvers av brukernavn", async () => {
    stubTihldeRejection();

    // Under grensen per brukernavn, men 30 forsøk fra samme IP til sammen.
    for (let i = 0; i < 10; i++) {
      await attempt(3, { user_id: `bruker${i}`, password: "x" });
    }

    // Et ferskt brukernavn fra samme IP skal også være stengt ute.
    expect((await post({ user_id: "helt-ny", password: "x" })).status).toBe(429);
  });

  it("lar en annen IP slippe til selv om én er utestengt", async () => {
    stubTihldeRejection();
    await attempt(10, { user_id: "offer", password: "x" });

    // Samme brukernavn fra en annen IP er fortsatt stengt (kontoen er vernet),
    // men et annet brukernavn fra den andre IP-en skal slippe gjennom.
    resetNextHeaders({ "user-agent": "vitest", "x-forwarded-for": "10.0.0.2" });
    expect((await post({ user_id: "offer", password: "x" })).status).toBe(429);
    expect((await post({ user_id: "en-annen", password: "x" })).status).toBe(401);
  });

  it("teller ikke vellykkede innlogginger", async () => {
    await createUser({
      tihldeUserId: "olanor",
      passwordHash: await hashPassword(CREDENTIALS.password),
    });
    stubTihldeRejection();

    for (let i = 0; i < 15; i++) {
      expect((await post(CREDENTIALS)).status).toBe(200);
    }
    expect(await db.loginAttempt.count()).toBe(0);
  });
});
