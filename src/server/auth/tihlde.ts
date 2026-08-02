import "server-only";

import { env } from "~/env";

/**
 * Thin client for TIHLDE's Lepton API.
 *
 * Auth flow (verified against the Lepton/Kvark source):
 *   POST {API}/auth/login/  body { user_id, password }  -> { token }
 *   GET  {API}/users/me/     header "X-CSRF-Token: <token>" -> profile
 *
 * Login only succeeds for activated TIHLDE members; otherwise Lepton returns
 * 401 with a Norwegian `detail` message which we surface to the user as-is.
 */

const TOKEN_HEADER = "X-CSRF-Token";

const apiUrl = (path: string) =>
  `${env.TIHLDE_API_URL.replace(/\/$/, "")}${path}`;

/** Raised for any non-success TIHLDE response; `message` is safe to show the user. */
export class TihldeAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TihldeAuthError";
  }
}

/**
 * Raised when TIHLDE could not be reached at all — a timeout, a dropped TLS
 * handshake, DNS failure.
 *
 * Distinct from `TihldeAuthError` because it says nothing about the user's
 * credentials, and the advice is the opposite: wait and retry rather than
 * check what you typed. These are not rare — Lepton timed out on 192 requests
 * across 11 users in the week before this was written, and every one of them
 * surfaced to the student as "Noe gikk galt", which reads as "you did
 * something wrong".
 */
export class TihldeUnavailableError extends TihldeAuthError {
  constructor(readonly cause?: unknown) {
    super(
      "Får ikke kontakt med TIHLDE akkurat nå. Vent litt og prøv igjen — det er ikke noe galt med det du fylte inn.",
      503,
    );
    this.name = "TihldeUnavailableError";
  }
}

/**
 * How long we wait for TIHLDE before giving up.
 *
 * Vercel's serverless functions have their own ceiling, and hitting that gives
 * the user a blank platform error instead of ours. Failing first means we can
 * say something useful.
 */
const TIHLDE_TIMEOUT_MS = 10_000;

/**
 * `fetch` against TIHLDE that turns transport failures into
 * `TihldeUnavailableError` instead of letting a raw `TypeError: fetch failed`
 * escape into a route's catch-all. Every call to Lepton goes through here.
 */
async function tihldeFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      // Never cache auth or profile requests.
      cache: "no-store",
      signal: AbortSignal.timeout(TIHLDE_TIMEOUT_MS),
    });
  } catch (err) {
    // AbortError (our timeout) and TypeError (DNS, TLS, ECONNRESET) both mean
    // the same thing to the person waiting: TIHLDE is not answering.
    throw new TihldeUnavailableError(err);
  }
}

/** The subset of `GET /users/me/` we map onto our local user. */
export interface TihldeProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  image: string | null;
  study: { group?: { name?: string } | null } | null;
  studyyear: { group?: { name?: string } | null } | null;
}

async function readDetail(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string };
    return body?.detail ?? fallback;
  } catch {
    return fallback;
  }
}

/** Authenticate against TIHLDE. Returns the API token on success. */
export async function tihldeLogin(
  userId: string,
  password: string,
): Promise<string> {
  const res = await tihldeFetch(apiUrl("/auth/login/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, password }),
    // Never cache auth requests.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new TihldeAuthError(
      await readDetail(res, "Brukernavnet eller passordet ditt var feil."),
      res.status,
    );
  }

  const data = (await res.json()) as { token?: string };
  if (!data.token) {
    throw new TihldeAuthError("Fikk ikke token fra TIHLDE.", 502);
  }
  return data.token;
}

/** Fields accepted by Lepton's public `POST /users/` (UserCreateSerializer). */
export interface TihldeCreateUserInput {
  user_id: string;
  password: string;
  first_name: string;
  last_name: string;
  email: string;
  /** STUDY group slug (linje), or null to skip the study membership. */
  study: string | null;
  /** STUDYYEAR group slug (kull), or null to skip the year membership. */
  class: string | null;
}

/**
 * Read a create-user error from Lepton. DRF returns the message in one of a few
 * shapes: `{detail: "..."}`, per-field arrays nested under `detail`
 * (`{detail: {email: ["..."]}}`), or those field arrays at the top level. We
 * surface the first human-readable message, mapping a duplicate `user_id` to a
 * login hint.
 */
async function readCreateError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown };

    if (typeof body.detail === "string") return body.detail;

    // Field errors live under `detail` when it's an object, else at top level.
    const bag =
      body.detail && typeof body.detail === "object"
        ? (body.detail as Record<string, unknown>)
        : (body as Record<string, unknown>);

    // user_id is the primary key; a duplicate means the account already exists.
    if ("user_id" in bag) {
      return "Brukernavnet er opptatt. Har du allerede en bruker? Logg inn i stedet.";
    }

    // Otherwise return the first field error message we can find.
    for (const value of Object.values(bag)) {
      if (typeof value === "string") return value;
      if (Array.isArray(value)) {
        const first = (value as unknown[])[0];
        if (typeof first === "string") return first;
      }
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Create a brand-new TIHLDE account via Lepton's public `POST /users/`.
 *
 * The account is created "pending" — it is NOT a TIHLDE member yet, so it cannot
 * log in on tihlde.org (or via our own TIHLDE login) until an admin approves it
 * through the normal Kvark flow (`POST /users/activate/`). We never store the
 * password: it is forwarded straight to TIHLDE.
 */
export async function tihldeCreateUser(
  input: TihldeCreateUserInput,
): Promise<void> {
  const res = await tihldeFetch(apiUrl("/users/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new TihldeAuthError(
      await readCreateError(res, "Kunne ikke opprette TIHLDE-brukeren din."),
      res.status,
    );
  }
}

/** Fetch the authenticated user's TIHLDE profile. */
export async function tihldeGetMe(token: string): Promise<TihldeProfile> {
  const res = await tihldeFetch(apiUrl("/users/me/"), {
    headers: { [TOKEN_HEADER]: token },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new TihldeAuthError(
      await readDetail(res, "Kunne ikke hente brukerinformasjonen din."),
      res.status,
    );
  }

  return (await res.json()) as TihldeProfile;
}

interface TihldeMembership {
  group: { slug?: string; name?: string } | null;
}

/** Safety net so a malformed `next` chain can never loop forever. */
const MAX_MEMBERSHIP_PAGES = 20;

/**
 * Fetch *all* of the user's group memberships.
 *
 * The endpoint is paginated (25 per page), and admin status hinges on finding
 * one specific group, so we must follow every page: a user in many groups could
 * otherwise have FadderKom on page 2 and silently lose admin.
 */
export async function tihldeGetMemberships(
  token: string,
  userId: string,
): Promise<TihldeMembership[]> {
  const all: TihldeMembership[] = [];
  let url: string | null = apiUrl(
    `/users/${encodeURIComponent(userId)}/memberships/`,
  );

  for (let page = 0; url && page < MAX_MEMBERSHIP_PAGES; page++) {
    const res: Response = await tihldeFetch(url, {
      headers: { [TOKEN_HEADER]: token },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new TihldeAuthError(
        await readDetail(res, "Kunne ikke hente gruppemedlemskap."),
        res.status,
      );
    }

    const body = (await res.json()) as
      | { results?: TihldeMembership[]; next?: string | null }
      | TihldeMembership[];

    if (Array.isArray(body)) {
      // Unpaginated response — everything is already here.
      all.push(...body);
      break;
    }

    all.push(...(body.results ?? []));
    url = body.next ?? null;
  }

  return all;
}

/** Whether the user is a member of any of the groups with the given slugs. */
export function isMemberOfAnyGroup(
  memberships: TihldeMembership[],
  slugs: readonly string[],
): boolean {
  return memberships.some(
    (m) => m.group?.slug != null && slugs.includes(m.group.slug),
  );
}

/**
 * Write the user's food allergies onto their TIHLDE profile (Lepton's `allergy`
 * field), so allergies live in TIHLDE — as Kvark does — instead of our own DB.
 *
 * Requires the user's own API token; a pending (not-yet-activated) account has
 * none, so the caller must only invoke this once the user has a real token.
 * Uses PATCH on `/users/{user_id}/` (Lepton's user update, where `allergy` is
 * writable) so we touch nothing but the allergy field.
 */
export async function tihldeUpdateAllergy(
  token: string,
  userId: string,
  allergy: string,
): Promise<void> {
  const res = await tihldeFetch(apiUrl(`/users/${encodeURIComponent(userId)}/`), {
    method: "PATCH",
    headers: {
      [TOKEN_HEADER]: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ allergy }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new TihldeAuthError(
      await readDetail(res, "Kunne ikke lagre allergiene dine i TIHLDE."),
      res.status,
    );
  }
}

/** Map a TIHLDE profile onto the fields we persist locally. */
export function mapProfile(profile: TihldeProfile) {
  const name = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    tihldeUserId: profile.user_id,
    name: name || profile.user_id,
    email: profile.email ?? null,
    image: profile.image ?? null,
    studieretning: profile.study?.group?.name ?? null,
    klasse: profile.studyyear?.group?.name ?? null,
  };
}
