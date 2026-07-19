import type { User } from "@prisma/client";

import { createCaller } from "~/server/api/root";
import { db } from "~/server/db";

/**
 * tRPC callers for tests.
 *
 * The session shape mirrors what `auth.api.getSession` returns in
 * `src/server/auth/config.ts` — `{ user, session }` — so the procedures under
 * test see exactly the context they see in production.
 */

function sessionFor(user: User, tihldeToken: string | null = "tihlde-token") {
  return {
    user,
    session: {
      id: `sess-${user.id}`,
      token: `token-${user.id}`,
      tihldeToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: null,
      userAgent: null,
    },
  };
}

/** Caller authenticated as `user`. */
export function callerFor(user: User) {
  return createCaller({
    db,
    session: sessionFor(user),
    headers: new Headers(),
  });
}

/** Caller with no session — every protected/admin procedure must reject it. */
export function anonCaller() {
  return createCaller({ db, session: null, headers: new Headers() });
}
