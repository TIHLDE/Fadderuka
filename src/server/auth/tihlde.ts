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
  const res = await fetch(apiUrl("/auth/login/"), {
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

/** Fetch the authenticated user's TIHLDE profile. */
export async function tihldeGetMe(token: string): Promise<TihldeProfile> {
  const res = await fetch(apiUrl("/users/me/"), {
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

interface PermissionEntry {
  read?: boolean;
  write?: boolean;
  write_all?: boolean;
  destroy?: boolean;
}

interface TihldePermissions {
  permissions: Record<string, PermissionEntry>;
}

/** Fetch the authenticated user's global TIHLDE permissions. */
export async function tihldeGetPermissions(
  token: string,
): Promise<TihldePermissions> {
  const res = await fetch(apiUrl("/users/me/permissions/"), {
    headers: { [TOKEN_HEADER]: token },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new TihldeAuthError(
      await readDetail(res, "Kunne ikke hente brukerens tillatelser."),
      res.status,
    );
  }

  return (await res.json()) as TihldePermissions;
}

/**
 * Whether a TIHLDE user counts as an admin for this app.
 *
 * Mirrors Kvark's `hasWritePermission`: a user with `write` or `write_all` on
 * any permission app holds an elevated/backend role (board, committee, HS,
 * Index, …). Regular members get read-only permissions and are not admins.
 */
export function isAdminFromPermissions(perms: TihldePermissions): boolean {
  return Object.values(perms.permissions ?? {}).some(
    (p) => p?.write === true || p?.write_all === true,
  );
}

interface TihldeMembership {
  group: { slug?: string; name?: string } | null;
}

/**
 * Fetch the user's group memberships. The endpoint is paginated (25 per page);
 * we read the first page, which is enough to detect committee membership.
 */
export async function tihldeGetMemberships(
  token: string,
  userId: string,
): Promise<TihldeMembership[]> {
  const res = await fetch(
    apiUrl(`/users/${encodeURIComponent(userId)}/memberships/`),
    { headers: { [TOKEN_HEADER]: token }, cache: "no-store" },
  );

  if (!res.ok) {
    throw new TihldeAuthError(
      await readDetail(res, "Kunne ikke hente gruppemedlemskap."),
      res.status,
    );
  }

  const body = (await res.json()) as
    | { results?: TihldeMembership[] }
    | TihldeMembership[];
  return Array.isArray(body) ? body : (body.results ?? []);
}

/** Whether the user is a member of the group with the given slug. */
export function isMemberOfGroup(
  memberships: TihldeMembership[],
  slug: string,
): boolean {
  return memberships.some((m) => m.group?.slug === slug);
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
