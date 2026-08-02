import "server-only";

import { randomBytes } from "crypto";
import { db } from "~/server/db";
import { decryptToken, encryptToken } from "./token-crypto";

/**
 * Custom session layer backing TIHLDE-based auth.
 *
 * We deliberately keep the `auth.api.getSession({ headers })` shape that the
 * rest of the app already calls, so server components and the tRPC context did
 * not need to change when we replaced better-auth.
 *
 * Sessions are opaque random tokens stored in Postgres and referenced by an
 * httpOnly cookie — no signing secret needed since the token carries no data.
 */

export const SESSION_COOKIE = "fadderuke.session_token";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

/**
 * How much of a session's life must have passed before a read extends it.
 *
 * Without this the expiry was absolute: a user who logged in on the Monday of
 * fadderuka was signed out mid-week no matter how actively they used the app.
 * Sliding the window on use keeps active users in, while an abandoned session
 * still dies on schedule. Rewriting on every request would mean a write per
 * page load, hence the threshold.
 */
const SESSION_RENEW_AFTER_MS = (SESSION_MAX_AGE * 1000) / 4;

/**
 * Chance, per session read, of also sweeping expired rows. Sessions are only
 * ever deleted when someone happens to present an expired one, so without a
 * sweep the table grows without bound. Sampling keeps it to roughly one extra
 * delete per hundred requests instead of one per request.
 */
const SESSION_SWEEP_PROBABILITY = 0.01;

/** Delete sessions that expired a while ago. Best-effort; never blocks a request. */
async function sweepExpiredSessions(): Promise<void> {
  try {
    await db.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  } catch (err) {
    console.error("[auth] expired-session sweep failed", err);
  }
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

async function getSession({ headers }: { headers: Headers }) {
  const token = parseCookie(headers.get("cookie"), SESSION_COOKIE);
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { token } }).catch(() => undefined);
    return null;
  }

  if (Math.random() < SESSION_SWEEP_PROBABILITY) {
    void sweepExpiredSessions();
  }

  // Slide the expiry once enough of the window has been used up, so continued
  // use keeps someone signed in. `expiresAt` is the anchor: it moves on every
  // renewal, so the elapsed time since the last one is what it implies about
  // the remaining life — using `createdAt` would re-renew on every single
  // request once the session got old enough. Best-effort: a failed write costs
  // a renewal, never the request.
  const sinceRenewal =
    Date.now() - (session.expiresAt.getTime() - SESSION_MAX_AGE * 1000);
  if (sinceRenewal > SESSION_RENEW_AFTER_MS) {
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
    await db.session
      .update({ where: { token }, data: { expiresAt } })
      .catch(() => undefined);
    session.expiresAt = expiresAt;
  }

  const { user, ...rest } = session;
  // Callers (allergy sync) expect a usable TIHLDE token, not the stored
  // ciphertext, so decrypt on the way out.
  return {
    user,
    session: { ...rest, tihldeToken: decryptToken(rest.tihldeToken) },
  };
}

/** Create a persisted session for a user and return its cookie token. */
export async function createSession(opts: {
  userId: string;
  // Self-registered users have no TIHLDE token until they're activated and log
  // in via TIHLDE, so this is optional.
  tihldeToken?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await db.session.create({
    data: {
      token,
      userId: opts.userId,
      // Encrypted at rest: this is a live credential for the user's real
      // TIHLDE account, and it outlives the session row.
      tihldeToken: encryptToken(opts.tihldeToken ?? null),
      expiresAt,
      ipAddress: opts.ipAddress ?? null,
      userAgent: opts.userAgent ?? null,
    },
  });

  return { token, expiresAt };
}

/** Invalidate a session by its cookie token. */
export async function deleteSession(token: string) {
  await db.session.deleteMany({ where: { token } });
}

/**
 * True when the signed-in user should choose a local password for this app.
 *
 * Two cases, both limited to accounts TIHLDE does not authenticate yet (no
 * token on the session, because tihlde.org has not approved them):
 *
 *  - No password at all: they registered here before we stored a hash, so
 *    nothing would let them back in once this session expires.
 *  - An admin-issued one-time password: it got them in, but it is a random
 *    string nobody wants to keep, so they are asked to replace it.
 *
 * Derived rather than a hardcoded list of usernames, so it stays correct as
 * accounts get approved and as new ones appear.
 */
export function needsLocalPassword(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
): boolean {
  if (session.session.tihldeToken) return false;
  return !session.user.passwordHash || session.user.passwordIsTemporary;
}

/**
 * Mirrors the better-auth `auth.api.getSession` interface the app relies on.
 * Returns `{ user, session } | null`.
 */
export const auth = {
  api: { getSession },
};
