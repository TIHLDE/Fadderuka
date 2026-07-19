import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { anonCaller, callerFor } from "../helpers/caller";
import { createAdmin, createUser, db } from "../helpers/db";
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

/** Stub the TIHLDE events endpoints: list + one detail per event. */
function stubTihldeEvents(
  events: { id: number; title: string; start_date: string; category: string }[],
) {
  fetchMock.on(
    "GET",
    "/events/",
    json({
      results: events.map((e) => ({
        id: e.id,
        title: e.title,
        start_date: e.start_date,
        location: "TIHLDE-kontoret",
        image: "",
        category: { id: 1, text: e.category },
      })),
    }),
  );
  for (const e of events) {
    fetchMock.on(
      "GET",
      `/events/${e.id}/`,
      json({
        id: e.id,
        title: e.title,
        start_date: e.start_date,
        location: "TIHLDE-kontoret",
        image: "",
        category: { id: 1, text: e.category },
        description: "Fra TIHLDE",
      }),
    );
  }
}

describe("activity.getUpcoming", () => {
  it("fletter TIHLDE-arrangementer med lokale aktiviteter, sortert på dato", async () => {
    await db.activity.create({
      data: localActivity({ title: "Lokal", date: new Date("2026-08-10T18:00:00Z") }),
    });
    stubTihldeEvents([
      { id: 1, title: "Fadderuka-event", start_date: "2026-08-09T18:00:00Z", category: "Fadderuka" },
      { id: 2, title: "Annet", start_date: "2026-08-08T18:00:00Z", category: "Bedpres" },
    ]);

    const events = await anonCaller().activity.getUpcoming();

    // Kun Fadderuka-kategorien fra TIHLDE, og lokal aktivitet sist (senest dato).
    expect(events.map((e) => e.title)).toEqual(["Fadderuka-event", "Lokal"]);
    expect(events.map((e) => e.source)).toEqual(["tihlde", "local"]);
    // Tom bilde-streng fra TIHLDE skal bli null, ikke "".
    expect(events[0]!.imageUrl).toBeNull();
  });

  it("viser lokale aktiviteter selv om TIHLDE er nede", async () => {
    await db.activity.create({ data: localActivity({ title: "Lokal" }) });
    fetchMock.on("GET", "/events/", text("service unavailable", 503));

    const events = await anonCaller().activity.getUpcoming();

    expect(events.map((e) => e.title)).toEqual(["Lokal"]);
  });

  it("hopper over arrangementer der detaljkallet feiler", async () => {
    stubTihldeEvents([
      { id: 1, title: "Ok", start_date: "2026-08-09T18:00:00Z", category: "Fadderuka" },
    ]);
    fetchMock.reset();
    fetchMock.on(
      "GET",
      "/events/",
      json({
        results: [
          {
            id: 1,
            title: "Ok",
            start_date: "2026-08-09T18:00:00Z",
            location: "",
            image: null,
            category: { id: 1, text: "Fadderuka" },
          },
        ],
      }),
    );
    fetchMock.on("GET", "/events/1/", text("boom", 500));

    await expect(anonCaller().activity.getUpcoming()).resolves.toEqual([]);
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

  it("getAll er åpen og sorterer på dato", async () => {
    await db.activity.create({
      data: localActivity({ title: "Sen", date: new Date("2026-08-20T18:00:00Z") }),
    });
    await db.activity.create({
      data: localActivity({ title: "Tidlig", date: new Date("2026-08-01T18:00:00Z") }),
    });

    const activities = await anonCaller().activity.getAll();

    expect(activities.map((a) => a.title)).toEqual(["Tidlig", "Sen"]);
  });
});
