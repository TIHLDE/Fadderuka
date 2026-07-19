import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSession,
} from "~/server/auth/config";
import { verifyPassword } from "~/server/auth/password";
import { db } from "~/server/db";
import {
  TihldeAuthError,
  isAdminFromPermissions,
  isMemberOfGroup,
  mapProfile,
  tihldeGetMe,
  tihldeGetMemberships,
  tihldeGetPermissions,
  tihldeLogin,
} from "~/server/auth/tihlde";

/** TIHLDE group whose members are always app admins. */
const ADMIN_GROUP_SLUG = "fadderkom";

const bodySchema = z.object({
  user_id: z.string().min(1, "Brukernavn er påkrevd."),
  password: z.string().min(1, "Passord er påkrevd."),
});

/** Mint our own session for `userId` and set the httpOnly cookie. */
async function issueSession(userId: string, tihldeToken: string | null) {
  const hdrs = await headers();
  const { token: sessionToken, expiresAt } = await createSession({
    userId,
    tihldeToken,
    ipAddress: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: hdrs.get("user-agent"),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    expires: expiresAt,
  });
}

/**
 * Fallback for self-registered users whose TIHLDE account is still pending
 * approval: Lepton rejects their login, but they already have a local account
 * (and possibly a paid Vipps order), so we accept the password hash we stored
 * during registration. Returns null when there is no local password to match,
 * in which case the caller surfaces TIHLDE's original error.
 */
async function tryLocalLogin(userId: string, password: string) {
  const user = await db.user.findUnique({
    where: { tihldeUserId: userId.toLowerCase() },
  });
  if (!user?.passwordHash) return null;
  if (!(await verifyPassword(password, user.passwordHash))) return null;

  await issueSession(user.id, null);
  return NextResponse.json({ ok: true, verified: user.isVerified });
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Fyll inn brukernavn og passord." },
      { status: 400 },
    );
  }

  try {
    // 1. Validate credentials against TIHLDE and fetch the profile.
    const token = await tihldeLogin(parsed.data.user_id, parsed.data.password);
    const profile = await tihldeGetMe(token);
    const mapped = mapProfile(profile);

    // 2. Derive admin status live from TIHLDE (as Kvark does). A user is an
    //    app admin if they hold write permissions OR are a member of the
    //    FadderKom committee. Admins are automatically app admins and skip
    //    payment, so we also mark them verified/paid. A fetch failure must not
    //    block login — and must not silently revoke an existing admin — so on
    //    error we leave admin-related flags untouched.
    let adminGrant: {
      isAdmin?: boolean;
      isVerified?: boolean;
      hasPaid?: boolean;
    } = {};
    try {
      const [perms, memberships] = await Promise.all([
        tihldeGetPermissions(token),
        tihldeGetMemberships(token, profile.user_id),
      ]);
      const isAdmin =
        isAdminFromPermissions(perms) ||
        isMemberOfGroup(memberships, ADMIN_GROUP_SLUG);
      adminGrant = isAdmin
        ? { isAdmin: true, isVerified: true, hasPaid: true }
        : { isAdmin: false };
    } catch (err) {
      console.error("[auth/login] admin derivation failed", err);
    }

    // 3. Upsert the local user, keyed by TIHLDE user_id. Payment flags for
    //    non-admins are owned by us (earned via Vipps) and left untouched.
    //    TIHLDE now authenticates this account, so the local registration
    //    password hash has served its purpose and is dropped.
    const user = await db.user.upsert({
      where: { tihldeUserId: mapped.tihldeUserId },
      create: { ...mapped, ...adminGrant },
      update: {
        name: mapped.name,
        email: mapped.email,
        image: mapped.image,
        studieretning: mapped.studieretning,
        klasse: mapped.klasse,
        passwordHash: null,
        ...adminGrant,
      },
    });

    // 4. Mint our own session and set the httpOnly cookie.
    await issueSession(user.id, token);

    // `verified` lets the registration page skip straight to the app for users
    // who don't owe a payment (admins/FadderKom are auto-verified above).
    return NextResponse.json({ ok: true, verified: user.isVerified });
  } catch (err) {
    if (err instanceof TihldeAuthError) {
      // 401/403 from TIHLDE → the account may simply not be approved on
      // tihlde.org yet, so try the local registration password first.
      if (err.status === 401 || err.status === 403) {
        const local = await tryLocalLogin(
          parsed.data.user_id,
          parsed.data.password,
        );
        if (local) return local;
        return NextResponse.json({ error: err.message }, { status: 401 });
      }
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[auth/login] unexpected error", err);
    return NextResponse.json(
      { error: "Noe gikk galt ved innlogging." },
      { status: 500 },
    );
  }
}
