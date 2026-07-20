import "server-only";

import { db } from "~/server/db";

/**
 * Rate limiting for login attempts.
 *
 * Before we stored local passwords, every attempt was answered by TIHLDE, who
 * absorbed the brute-force problem. Now a self-registered account can be opened
 * with a password we verify ourselves, so an unthrottled endpoint is worth
 * guessing against.
 *
 * Counters live in Postgres rather than in memory: on Vercel the app scales out
 * across instances, so an in-memory counter would only limit whichever instance
 * happened to serve the request — exactly the guarantee an attacker gets to
 * ignore by sending requests faster.
 *
 * Only failures are recorded, and a successful login clears them, so a user who
 * mistypes a few times and then gets it right is never held back.
 */

const WINDOW_MS = 15 * 60 * 1000;

/** Failed attempts per username before we stop answering. */
const MAX_PER_USER = 10;
/** Failed attempts from one IP, across usernames — catches spraying. */
const MAX_PER_IP = 30;

const userKey = (userId: string) => `user:${userId.trim().toLowerCase()}`;
const ipKey = (ip: string) => `ip:${ip}`;

export interface RateLimitVerdict {
  blocked: boolean;
  /** Whole minutes until the oldest counted attempt falls out of the window. */
  retryAfterMinutes: number;
}

/**
 * Check whether this username/IP has spent its budget. Called before we talk to
 * TIHLDE, so a blocked attempt costs neither us nor Lepton anything.
 */
export async function checkLoginRateLimit(
  userId: string,
  ip: string | null,
): Promise<RateLimitVerdict> {
  const since = new Date(Date.now() - WINDOW_MS);
  const keys = ip ? [userKey(userId), ipKey(ip)] : [userKey(userId)];

  const attempts = await db.loginAttempt.findMany({
    where: { key: { in: keys }, createdAt: { gte: since } },
    select: { key: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const forUser = attempts.filter((a) => a.key === keys[0]);
  const forIp = ip ? attempts.filter((a) => a.key === ipKey(ip)) : [];

  const overUser = forUser.length >= MAX_PER_USER;
  const overIp = forIp.length >= MAX_PER_IP;
  if (!overUser && !overIp) return { blocked: false, retryAfterMinutes: 0 };

  // The block lifts when the oldest attempt in the offending bucket ages out.
  const oldest = (overUser ? forUser : forIp)[0]!.createdAt;
  const msLeft = oldest.getTime() + WINDOW_MS - Date.now();
  return {
    blocked: true,
    retryAfterMinutes: Math.max(1, Math.ceil(msLeft / 60_000)),
  };
}

/** Record a failed attempt and drop rows that have aged out of the window. */
export async function recordFailedLogin(
  userId: string,
  ip: string | null,
): Promise<void> {
  const rows = [{ key: userKey(userId) }];
  if (ip) rows.push({ key: ipKey(ip) });

  await db.loginAttempt.createMany({ data: rows });
  await db.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - WINDOW_MS) } },
  });
}

/** Wipe the counters for a username/IP after they prove they know the password. */
export async function clearLoginFailures(
  userId: string,
  ip: string | null,
): Promise<void> {
  const keys = ip ? [userKey(userId), ipKey(ip)] : [userKey(userId)];
  await db.loginAttempt.deleteMany({ where: { key: { in: keys } } });
}
