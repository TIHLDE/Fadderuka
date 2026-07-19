import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSession,
} from "~/server/auth/config";
import { db } from "~/server/db";
import {
  TihldeAuthError,
  isMemberOfAnyGroup,
  mapProfile,
  tihldeGetMe,
  tihldeGetMemberships,
  tihldeLogin,
} from "~/server/auth/tihlde";

/**
 * TIHLDE groups whose members are always app admins: FadderKom runs Fadderuka,
 * and Index drifter appen. Membership in any *other* committee grants nothing.
 */
const ADMIN_GROUP_SLUGS = ["fadderkom", "index"];

const bodySchema = z.object({
  user_id: z.string().min(1, "Brukernavn er påkrevd."),
  password: z.string().min(1, "Passord er påkrevd."),
});

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

    // 2. Decide admin status. A manual decision in the admin panel
    //    (`adminOverride`) always wins and survives every login; otherwise we
    //    derive it live from TIHLDE, where the sole criterion is membership in
    //    one of the committees that run the app. Deliberately NOT based on
    //    TIHLDE write permissions: those are handed out to every committee
    //    member, which made anyone holding any verv an admin of this app.
    //
    //    Admins skip payment, so we also mark them verified/paid. A fetch
    //    failure must not block login — and must not silently revoke an
    //    existing admin — so on error we leave admin-related flags untouched.
    const existing = await db.user.findUnique({
      where: { tihldeUserId: mapped.tihldeUserId },
      select: { adminOverride: true },
    });

    const grantFor = (isAdmin: boolean) =>
      isAdmin
        ? { isAdmin: true, isVerified: true, hasPaid: true }
        : { isAdmin: false };

    let adminGrant: {
      isAdmin?: boolean;
      isVerified?: boolean;
      hasPaid?: boolean;
    } = {};
    if (existing?.adminOverride != null) {
      adminGrant = grantFor(existing.adminOverride);
    } else {
      try {
        const memberships = await tihldeGetMemberships(token, profile.user_id);
        adminGrant = grantFor(isMemberOfAnyGroup(memberships, ADMIN_GROUP_SLUGS));
      } catch (err) {
        console.error("[auth/login] admin derivation failed", err);
      }
    }

    // 3. Upsert the local user, keyed by TIHLDE user_id. Payment flags for
    //    non-admins are owned by us (earned via Vipps) and left untouched.
    const user = await db.user.upsert({
      where: { tihldeUserId: mapped.tihldeUserId },
      create: { ...mapped, ...adminGrant },
      update: {
        name: mapped.name,
        email: mapped.email,
        image: mapped.image,
        studieretning: mapped.studieretning,
        klasse: mapped.klasse,
        ...adminGrant,
      },
    });

    // 4. Mint our own session and set the httpOnly cookie.
    const hdrs = await headers();
    const { token: sessionToken, expiresAt } = await createSession({
      userId: user.id,
      tihldeToken: token,
      ipAddress:
        hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
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

    // `verified` lets the registration page skip straight to the app for users
    // who don't owe a payment (admins are auto-verified above).
    return NextResponse.json({ ok: true, verified: user.isVerified });
  } catch (err) {
    if (err instanceof TihldeAuthError) {
      // 401/403 from TIHLDE → surface the (Norwegian) detail to the user.
      const status = err.status === 401 || err.status === 403 ? 401 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error("[auth/login] unexpected error", err);
    return NextResponse.json(
      { error: "Noe gikk galt ved innlogging." },
      { status: 500 },
    );
  }
}
