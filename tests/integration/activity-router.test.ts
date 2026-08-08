import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { anonCaller, callerFor } from "../helpers/caller";
import { createAdmin, createMember, createUser, db } from "../helpers/db";
import { fetchMock, json, text } from "../helpers/fetch-mock";

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy(
    (err: unknown) => err instanceof TRPCError && err.code === code,
    `forventet TRPCError med kode ${code}`,
  );
}

const localActivity = (overrides: Partial<{ title: string; date: Date }> = {}) => ({
  title: overrides.title ?? "Grillfest",
  description: "Beskrivelse",
  location: "Samfundet",
  date: overrides.date ?? new Date("2026-08-10T18:00:00Z"),
});

/**
 * Datoer relativt til nå. `getUpcoming` filtrerer bort passerte arrangementer,
 * så faste datoer ville fått testene til å ryke av seg selv når den dagen kom.
 */
const inDays = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

/** Stub Photons event-endepunkter: lista + ett detaljkall per event. */
function stubPhotonEvents(
  events: { id: string; title: string; startTime: Date; category: string }[],
) {
  const asItem = (e: (typeof events)[number]) => ({
    id: e.id,
    title: e.title,
    location: "TIHLDE-kontoret",
    startTime: e.startTime.toISOString(),
    endTime: new Date(e.startTime.getTime() + 3 * 60 * 60 * 1000).toISOString(),
    image: "",
    category: { slug: e.category, label: e.category },
    visibility: "public",
  });

  fetchMock.on(
    "GET",
    "/api/event",
    json({ items: events.map(asItem), nextPage: null }),
  );
  for (const e of events) {
    fetchMock.on(
      "GET",
      `/api/event/${e.id}`,
      json({ ...asItem(e), description: "Fra Photon" }),
    );
  }
}

describe("activity.getUpcoming", () => {
  it("fletter Photon-arrangementer med lokale aktiviteter, sortert på dato", async () => {
    await db.activity.create({
      data: localActivity({ title: "Lokal", date: inDays(3) }),
    });
    stubPhotonEvents([
      {
        id: "evt-1",
        title: "Fadderuka-event",
        startTime: inDays(2),
        category: "fadderuka",
      },
      {
        id: "evt-2",
        title: "Annet",
        startTime: inDays(1),
        category: "bedpres",
      },
    ]);

    const events = await callerFor(await createMember()).activity.getUpcoming();

    // Kun Fadderuka-kategorien fra Photon, og lokal aktivitet sist (senest dato).
    expect(events.map((e) => e.title)).toEqual(["Fadderuka-event", "Lokal"]);
    expect(events.map((e) => e.source)).toEqual(["photon", "local"]);
    // Tom bilde-streng fra Photon skal bli null, ikke "".
    expect(events[0]!.imageUrl).toBeNull();
  });

  it("viser lokale aktiviteter selv om Photon er nede", async () => {
    await db.activity.create({ data: localActivity({ title: "Lokal" }) });
    fetchMock.on("GET", "/api/event", text("service unavailable", 503));

    const events = await callerFor(await createMember()).activity.getUpcoming();

    expect(events.map((e) => e.title)).toEqual(["Lokal"]);
  });

  it("hopper over arrangementer der detaljkallet feiler", async () => {
    stubPhotonEvents([
      {
        id: "evt-1",
        title: "Ok",
        startTime: inDays(2),
        category: "fadderuka",
      },
    ]);
    fetchMock.reset();
    fetchMock.on(
      "GET",
      "/api/event",
      json({
        items: [
          {
            id: "evt-1",
            title: "Ok",
            location: "",
            startTime: inDays(2).toISOString(),
            endTime: inDays(2).toISOString(),
            image: null,
            category: { slug: "fadderuka", label: "Fadderuka" },
            visibility: "public",
          },
        ],
        nextPage: null,
      }),
    );
    fetchMock.on("GET", "/api/event/evt-1", text("boom", 500));

    await expect(
      callerFor(await createMember()).activity.getUpcoming(),
    ).resolves.toEqual([]);
  });
});

describe("activity: adminmutasjoner", () => {
  it("oppretter, oppdaterer og sletter en aktivitet", async () => {
    const admin = await createAdmin();
    const caller = callerFor(admin);

    const created = await caller.activity.create({
      title: "Grillfest",
      description: "Beskrivelse",
      location: "Samfundet",
      imageUrl: "",
      date: "2026-08-10T18:00:00.000Z",
    });
    // Tom imageUrl er tillatt av skjemaet og skal lagres som null, ikke "".
    expect(created.imageUrl).toBeNull();

    const updated = await caller.activity.update({
      id: created.id,
      title: "Grillfest 2",
      description: "Ny beskrivelse",
      location: "Samfundet",
      imageUrl: "https://example.com/bilde.png",
      date: "2026-08-11T18:00:00.000Z",
    });
    expect(updated.title).toBe("Grillfest 2");
    expect(updated.imageUrl).toBe("https://example.com/bilde.png");

    await caller.activity.delete({ id: created.id });
    expect(await db.activity.count()).toBe(0);
  });

  it("krever admin for å endre aktiviteter", async () => {
    const user = await createUser();
    const input = {
      title: "Grillfest",
      description: "Beskrivelse",
      location: "Samfundet",
      date: "2026-08-10T18:00:00.000Z",
    };

    await expectCode(callerFor(user).activity.create(input), "FORBIDDEN");
    await expectCode(anonCaller().activity.create(input), "UNAUTHORIZED");
    await expectCode(callerFor(user).activity.delete({ id: "x" }), "FORBIDDEN");
    expect(await db.activity.count()).toBe(0);
  });

  it("avviser ugyldig dato og tom tittel", async () => {
    const admin = await createAdmin();
    const caller = callerFor(admin);

    await expectCode(
      caller.activity.create({
        title: "",
        description: "d",
        location: "l",
        date: "2026-08-10T18:00:00.000Z",
      }),
      "BAD_REQUEST",
    );
    await expectCode(
      caller.activity.create({
        title: "t",
        description: "d",
        location: "l",
        date: "10. august",
      }),
      "BAD_REQUEST",
    );
  });

  it("getAll sorterer på dato", async () => {
    const member = await createMember();
    await db.activity.create({
      data: localActivity({ title: "Sen", date: new Date("2026-08-20T18:00:00Z") }),
    });
    await db.activity.create({
      data: localActivity({ title: "Tidlig", date: new Date("2026-08-01T18:00:00Z") }),
    });

    const activities = await callerFor(member).activity.getAll();

    expect(activities.map((a) => a.title)).toEqual(["Tidlig", "Sen"]);
  });
});

/**
 * Betalingsmuren var tidligere bare et overlegg i klienten: innholdet lå
 * server-rendret under, og disse endepunktene var åpne. Det holdt å fjerne
 * ett element i devtools for å bruke appen uten å betale.
 */
describe("aktiviteter er bak betalingsmuren", () => {
  it("avviser uinnloggede", async () => {
    await expectCode(anonCaller().activity.getUpcoming(), "UNAUTHORIZED");
    await expectCode(anonCaller().activity.getAll(), "UNAUTHORIZED");
  });

  it("avviser en innlogget bruker som ikke har betalt", async () => {
    const unpaid = await createUser();

    await expectCode(callerFor(unpaid).activity.getUpcoming(), "FORBIDDEN");
    await expectCode(callerFor(unpaid).activity.getAll(), "FORBIDDEN");
  });

  it("slipper inn faddere, som aldri betaler", async () => {
    const fadder = await createUser({ isFadder: true, isVerified: false });

    await expect(callerFor(fadder).activity.getAll()).resolves.toEqual([]);
  });
});
