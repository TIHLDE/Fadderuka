import "server-only";

import { env } from "~/env";

/**
 * Read-only client for TIHLDE's Lepton events API.
 *
 * The events endpoints are public (no auth), so we fetch them server-side and
 * cache the responses. We surface only the events in the "Fadderuka" category,
 * mapped onto the same shape the app uses for its local activities.
 *
 *   GET {API}/events/           -> paginated list (upcoming/non-expired only)
 *   GET {API}/events/{id}/      -> single event incl. `description`
 */

/** Category text (not id — ids can drift) used to select Fadderuka events. */
const FADDERUKA_CATEGORY = "Fadderuka";

/** How long (seconds) to cache TIHLDE responses. Events change rarely. */
const REVALIDATE_SECONDS = 300;

const apiUrl = (path: string) =>
  `${env.TIHLDE_API_URL.replace(/\/$/, "")}${path}`;

/** The normalized event shape shared by TIHLDE and local activities. */
export interface EventItem {
  id: string;
  title: string;
  description: string;
  location: string;
  date: Date;
  imageUrl: string | null;
  source: "tihlde" | "local";
}

interface TihldeEventListItem {
  id: number;
  title: string;
  start_date: string;
  location: string;
  image: string | null;
  category: { id: number; text: string } | null;
}

interface TihldeEventDetail extends TihldeEventListItem {
  description: string;
}

/**
 * Fetch upcoming Fadderuka events from TIHLDE, normalized to `EventItem`.
 *
 * On any network/API failure this returns an empty array rather than throwing,
 * so a TIHLDE outage never breaks the pages (local activities still render).
 */
export async function getTihldeFadderukaEvents(): Promise<EventItem[]> {
  try {
    const res = await fetch(apiUrl("/events/?page_size=100"), {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];

    const body = (await res.json()) as { results?: TihldeEventListItem[] };
    const fadderuka = (body.results ?? []).filter(
      (e) => e.category?.text === FADDERUKA_CATEGORY,
    );

    // The list endpoint omits `description`; fetch each event's detail for it.
    const detailed = await Promise.all(
      fadderuka.map((e) => getEventDetail(e.id)),
    );

    return detailed
      .filter((e): e is TihldeEventDetail => e !== null)
      .map(mapEvent);
  } catch {
    return [];
  }
}

async function getEventDetail(id: number): Promise<TihldeEventDetail | null> {
  try {
    const res = await fetch(apiUrl(`/events/${id}/`), {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as TihldeEventDetail;
  } catch {
    return null;
  }
}

function mapEvent(e: TihldeEventDetail): EventItem {
  return {
    id: `tihlde-${e.id}`,
    title: e.title,
    description: e.description,
    location: e.location,
    date: new Date(e.start_date),
    // `||` is intentional: `image` is often an empty string on Fadderuka
    // events, and we want to coerce "" (not just null) to null.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    imageUrl: e.image || null,
    source: "tihlde",
  };
}
