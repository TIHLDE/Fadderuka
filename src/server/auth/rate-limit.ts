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

/**
 * Registration throttling.
 *
 * `POST /api/auth/register` forwards straight to Lepton's public user-creation
 * endpoint, so an unthrottled route here is an open account-creation proxy for
 * TIHLDE — our IP doing the creating. Unlike login there is no "failure" to
 * count: creating an account is the success case, and it is the successes we
 * need to bound. So every attempt is recorded, per IP only, since a new user by
 * definition has no username we know yet.
 */
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

/** New accounts one IP may create per hour. Generous for a shared campus NAT. */
const MAX_REGISTRATIONS_PER_IP = 10;

const registerKey = (ip: string) => `register-ip:${ip}`;

/** Whether this IP has used up its registration budget. */
export async function checkRegisterRateLimit(
  ip: string | null,
): Promise<RateLimitVerdict> {
  if (!ip) return { blocked: false, retryAfterMinutes: 0 };

  const since = new Date(Date.now() - REGISTER_WINDOW_MS);
  const attempts = await db.loginAttempt.findMany({
    where: { key: registerKey(ip), createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (attempts.length < MAX_REGISTRATIONS_PER_IP) {
    return { blocked: false, retryAfterMinutes: 0 };
  }

  const msLeft = attempts[0]!.createdAt.getTime() + REGISTER_WINDOW_MS - Date.now();
  return {
    blocked: true,
    retryAfterMinutes: Math.max(1, Math.ceil(msLeft / 60_000)),
  };
}

/**
 * Password reset throttling.
 *
 * Every request sends an email to an address we did not choose, so an
 * unthrottled endpoint is a way to mailbomb a student through TIHLDE's mail
 * relay — and a way to burn Photon's sending quota. Successes are what need
 * bounding here, same as registration, so every accepted request is counted.
 *
 * Counted per username as well as per IP: the per-IP cap alone would let a
 * distributed caller keep hitting the same inbox.
 */
const RESET_WINDOW_MS = 60 * 60 * 1000;

/** Reset mails one account may trigger per hour. */
const MAX_RESETS_PER_USER = 5;
/** Reset mails one IP may trigger per hour, across accounts. */
const MAX_RESETS_PER_IP = 15;

const resetUserKey = (userId: string) =>
  `reset-user:${userId.trim().toLowerCase()}`;
const resetIpKey = (ip: string) => `reset-ip:${ip}`;

/** Whether this username/IP has used up its reset budget. */
export async function checkResetRateLimit(
  userId: string,
  ip: string | null,
): Promise<RateLimitVerdict> {
  const since = new Date(Date.now() - RESET_WINDOW_MS);
  const keys = ip ? [resetUserKey(userId), resetIpKey(ip)] : [resetUserKey(userId)];

  const attempts = await db.loginAttempt.findMany({
    where: { key: { in: keys }, createdAt: { gte: since } },
    select: { key: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const forUser = attempts.filter((a) => a.key === keys[0]);
  const forIp = ip ? attempts.filter((a) => a.key === resetIpKey(ip)) : [];

  const overUser = forUser.length >= MAX_RESETS_PER_USER;
  const overIp = forIp.length >= MAX_RESETS_PER_IP;
  if (!overUser && !overIp) return { blocked: false, retryAfterMinutes: 0 };

  const oldest = (overUser ? forUser : forIp)[0]!.createdAt;
  const msLeft = oldest.getTime() + RESET_WINDOW_MS - Date.now();
  return {
    blocked: true,
    retryAfterMinutes: Math.max(1, Math.ceil(msLeft / 60_000)),
  };
}

/** Record a sent reset mail and drop rows that have aged out. */
export async function recordResetAttempt(
  userId: string,
  ip: string | null,
): Promise<void> {
  const rows = [{ key: resetUserKey(userId) }];
  if (ip) rows.push({ key: resetIpKey(ip) });

  await db.loginAttempt.createMany({ data: rows });
  await db.loginAttempt.deleteMany({
    where: {
      key: { startsWith: "reset-" },
      createdAt: { lt: new Date(Date.now() - RESET_WINDOW_MS) },
    },
  });
}

/** Record a registration attempt and drop rows that have aged out. */
export async function recordRegisterAttempt(ip: string | null): Promise<void> {
  if (!ip) return;
  await db.loginAttempt.create({ data: { key: registerKey(ip) } });
  await db.loginAttempt.deleteMany({
    where: {
      key: { startsWith: "register-ip:" },
      createdAt: { lt: new Date(Date.now() - REGISTER_WINDOW_MS) },
    },
  });
}
