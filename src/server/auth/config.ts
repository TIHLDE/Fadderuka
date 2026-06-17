import "server-only";

import { randomBytes } from "crypto";
import { db } from "~/server/db";

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

  const { user, ...rest } = session;
  return { user, session: rest };
}

/** Create a persisted session for a user and return its cookie token. */
export async function createSession(opts: {
  userId: string;
  tihldeToken: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await db.session.create({
    data: {
      token,
      userId: opts.userId,
      tihldeToken: opts.tihldeToken,
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
 * Mirrors the better-auth `auth.api.getSession` interface the app relies on.
 * Returns `{ user, session } | null`.
 */
export const auth = {
  api: { getSession },
};
