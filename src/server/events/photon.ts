import "server-only";

import { env } from "~/env";

/**
 * Read-only client for Photon's event API.
 *
 * Erstatter den gamle Lepton-klienten (`api.tihlde.org`). Lepton er ikke lenger
 * kilden til noe: FadderKom legger events i Photon, og Lepton-lista var en
 * utdatert speiling — den viste 11 av de 16 arrangementene som faktisk lå inne.
 *
 * Endepunktene er åpne (ingen auth), så vi henter dem server-side og cacher
 * svarene. Vi viser kun events i «Fadderuka»-kategorien, mappet til samme form
 * som appens egne aktiviteter.
 *
 *   GET {PHOTON}/api/event?category=fadderuka&expired=false -> paginert liste
 *   GET {PHOTON}/api/event/{id}                             -> ett event inkl. `description`
 *
 * NB: Photon ignorerer ukjente query-parametre i stedet for å feile. Skulle
 * `category`/`expired` bli døpt om, ville vi altså fått *alle* 1200+ events
 * gjennom alle år. Derfor filtreres det på kategori og starttid her også.
 */

/** Kategori-slug (stabil, i motsetning til Leptons numeriske id-er). */
const FADDERUKA_CATEGORY = "fadderuka";

/** Cache-tag for alle Photon-event-svar, så cachen kan tømmes på kommando. */
export const PHOTON_EVENTS_TAG = "photon-events";

/**
 * Hvor lenge (sekunder) vi cacher event-svar. Ett minutt: nye og endrede events
 * i Photon skal dukke opp av seg selv uten at vi hamrer på API-et.
 */
const REVALIDATE_SECONDS = 60;

/** Sikkerhetsventil mot en evig paginerings-løkke om API-et oppfører seg rart. */
const MAX_PAGES = 20;

const apiUrl = (path: string) =>
  `${env.PHOTON_API_URL.replace(/\/$/, "")}${path}`;

/** The normalized event shape shared by Photon and local activities. */
export interface EventItem {
  id: string;
  title: string;
  description: string;
  location: string;
  date: Date;
  imageUrl: string | null;
  source: "photon" | "local";
}

interface PhotonCategory {
  slug: string;
  label: string;
}

interface PhotonEventListItem {
  id: string;
  title: string;
  location: string;
  startTime: string;
  endTime: string | null;
  image: string | null;
  category: PhotonCategory | null;
  visibility: string;
}

interface PhotonEventDetail extends PhotonEventListItem {
  description: string;
}

interface PhotonPage<T> {
  items?: T[];
  /** Nullbasert sidetall for neste side, eller null på siste side. */
  nextPage?: number | null;
}

/**
 * Fetch upcoming Fadderuka events from Photon, normalized to `EventItem`.
 *
 * On any network/API failure this returns an empty array rather than throwing,
 * so a Photon outage never breaks the pages (local activities still render).
 */
export async function getPhotonFadderukaEvents(): Promise<EventItem[]> {
  try {
    const list = await listAllEvents();
    const now = Date.now();

    const fadderuka = list.filter(
      (e) =>
        e.category?.slug === FADDERUKA_CATEGORY &&
        e.visibility === "public" &&
        // Måles mot sluttidspunktet, ikke starten: et arrangement som pågår nå
        // er nettopp det man vil finne i appen, og skal ikke falle ut kl. 18:01.
        new Date(e.endTime ?? e.startTime).getTime() >= now,
    );

    // Lista mangler `description`; hent detaljene for hvert event.
    const detailed = await Promise.all(
      fadderuka.map((e) => getEventDetail(e.id)),
    );

    return detailed
      .filter((e): e is PhotonEventDetail => e !== null)
      .map(mapEvent);
  } catch {
    return [];
  }
}

/**
 * Henter alle sider fra `/api/event`. Photon paginerer nullbasert og oppgir
 * neste side i `nextPage` (null på siste side).
 */
async function listAllEvents(): Promise<PhotonEventListItem[]> {
  const events: PhotonEventListItem[] = [];
  let page: number | null = 0;

  for (let i = 0; i < MAX_PAGES && page !== null; i++) {
    const res = await fetch(
      apiUrl(
        `/api/event?category=${FADDERUKA_CATEGORY}&expired=false&page=${page}`,
      ),
      { next: { revalidate: REVALIDATE_SECONDS, tags: [PHOTON_EVENTS_TAG] } },
    );
    if (!res.ok) break;

    const body = (await res.json()) as PhotonPage<PhotonEventListItem>;
    events.push(...(body.items ?? []));
    page = body.nextPage ?? null;
  }

  return events;
}

async function getEventDetail(id: string): Promise<PhotonEventDetail | null> {
  try {
    const res = await fetch(apiUrl(`/api/event/${encodeURIComponent(id)}`), {
      next: { revalidate: REVALIDATE_SECONDS, tags: [PHOTON_EVENTS_TAG] },
    });
    if (!res.ok) return null;
    return (await res.json()) as PhotonEventDetail;
  } catch {
    return null;
  }
}

function mapEvent(e: PhotonEventDetail): EventItem {
  return {
    id: `photon-${e.id}`,
    title: e.title,
    description: e.description,
    location: e.location,
    date: new Date(e.startTime),
    // `||` is intentional: `image` is sometimes an empty string rather than
    // null, and we want to coerce "" (not just null) to null.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    imageUrl: e.image || null,
    source: "photon",
  };
}
