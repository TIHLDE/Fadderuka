import "server-only";

import { db } from "~/server/db";

export interface RateLimitVerdict {
  blocked: boolean;
  /** Whole minutes until the oldest counted attempt falls out of the window. */
  retryAfterMinutes: number;
}

/**
 * Registration throttling.
 *
 * `POST /api/auth/register` forwards straight to Photon's user-creation endpoint,
 * so an unthrottled route here is an open account-creation proxy for TIHLDE —
 * our IP doing the creating. Unlike login there is no "failure" to
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

  const msLeft =
    attempts[0]!.createdAt.getTime() + REGISTER_WINDOW_MS - Date.now();
  return {
    blocked: true,
    retryAfterMinutes: Math.max(1, Math.ceil(msLeft / 60_000)),
  };
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
