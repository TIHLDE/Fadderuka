import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchMock, json, text } from "../helpers/fetch-mock";
import { getPhotonFadderukaEvents } from "~/server/events/photon";

/**
 * `getPhotonFadderukaEvents` mot en stubbet Photon.
 *
 * To ting testene passer særlig på: at pagineringen følges (Photon gir 50 per
 * side), og at vi filtrerer på kategori og starttid selv. Photon ignorerer
 * ukjente query-parametre i stedet for å feile, så skulle `category`/`expired`
 * bli døpt om, ville vi ellers fått alle events gjennom alle år rett inn i lista.
 */

/** Testene låser klokka hit, så "kommende" er forutsigbart. */
const NOW = new Date("2026-08-01T12:00:00.000Z");

const FADDERUKA = { slug: "fadderuka", label: "Fadderuka" };

function listItem(
  id: string,
  overrides: Partial<{
    startTime: string;
    endTime: string | null;
    category: { slug: string; label: string } | null;
    visibility: string;
    image: string | null;
  }> = {},
) {
  return {
    id,
    title: `Event ${id}`,
    location: "Faddergruppe",
    startTime: "2026-08-10T16:00:00.000Z",
    endTime: "2026-08-10T21:59:00.000Z",
    image: "",
    category: FADDERUKA,
    visibility: "public",
    ...overrides,
  };
}

/** Detaljendepunktet svarer for enhver id med en beskrivelse. */
function stubDetails() {
  fetchMock.on("GET", /^\/api\/event\/[^/]+$/, (call) => {
    const id = call.path.split("/").pop()!;
    return json({ ...listItem(id), description: `Beskrivelse ${id}` });
  });
}

describe("getPhotonFadderukaEvents", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function freezeClock() {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  }

  it("følger pagineringen, så events på side 2 ikke forsvinner", async () => {
    freezeClock();
    fetchMock.on("GET", "/api/event", (call) =>
      call.path.includes("page=1")
        ? json({ items: [listItem("b")], nextPage: null })
        : json({ items: [listItem("a")], nextPage: 1 }),
    );
    stubDetails();

    const events = await getPhotonFadderukaEvents();

    expect(events.map((e) => e.id)).toEqual(["photon-a", "photon-b"]);
  });

  it("ber Photon om kun kommende Fadderuka-events", async () => {
    freezeClock();
    fetchMock.on("GET", "/api/event", json({ items: [], nextPage: null }));

    await getPhotonFadderukaEvents();

    const path = fetchMock.callsTo("/api/event")[0]?.path;
    expect(path).toContain("category=fadderuka");
    expect(path).toContain("expired=false");
  });

  it("filtrerer bort andre kategorier, ikke-offentlige og passerte events", async () => {
    freezeClock();
    fetchMock.on(
      "GET",
      "/api/event",
      json({
        items: [
          listItem("beholdes"),
          listItem("feil-kategori", {
            category: { slug: "sosialt", label: "Sosialt" },
          }),
          listItem("skjult", { visibility: "private" }),
          listItem("passert", {
            startTime: "2026-07-01T16:00:00.000Z",
            endTime: "2026-07-01T21:59:00.000Z",
          }),
        ],
        nextPage: null,
      }),
    );
    stubDetails();

    const events = await getPhotonFadderukaEvents();

    expect(events.map((e) => e.id)).toEqual(["photon-beholdes"]);
  });

  it("beholder et arrangement som pågår akkurat nå", async () => {
    freezeClock();
    fetchMock.on(
      "GET",
      "/api/event",
      json({
        items: [
          listItem("pagar", {
            // Startet for en time siden, varer to timer til.
            startTime: "2026-08-01T11:00:00.000Z",
            endTime: "2026-08-01T14:00:00.000Z",
          }),
        ],
        nextPage: null,
      }),
    );
    stubDetails();

    const events = await getPhotonFadderukaEvents();

    expect(events.map((e) => e.id)).toEqual(["photon-pagar"]);
  });

  it("normaliserer feltene og gjør tom bilde-streng til null", async () => {
    freezeClock();
    fetchMock.on(
      "GET",
      "/api/event",
      json({ items: [listItem("a")], nextPage: null }),
    );
    stubDetails();

    const [event] = await getPhotonFadderukaEvents();

    expect(event).toMatchObject({
      id: "photon-a",
      title: "Event a",
      description: "Beskrivelse a",
      location: "Faddergruppe",
      imageUrl: null,
      source: "photon",
    });
    expect(event?.date.toISOString()).toBe("2026-08-10T16:00:00.000Z");
  });

  it("returnerer tom liste når Photon er nede, i stedet for å kaste", async () => {
    freezeClock();
    fetchMock.on("GET", "/api/event", text("bad gateway", 502));

    await expect(getPhotonFadderukaEvents()).resolves.toEqual([]);
  });

  it("hopper over events der detaljkallet feiler, men beholder resten", async () => {
    freezeClock();
    fetchMock.on(
      "GET",
      "/api/event",
      json({ items: [listItem("a"), listItem("b")], nextPage: null }),
    );
    fetchMock.on("GET", "/api/event/a", text("not found", 404));
    stubDetails();

    const events = await getPhotonFadderukaEvents();

    expect(events.map((e) => e.id)).toEqual(["photon-b"]);
  });
});
