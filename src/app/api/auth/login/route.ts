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
  isAdminFromPermissions,
  mapProfile,
  tihldeGetMe,
  tihldeGetPermissions,
  tihldeLogin,
} from "~/server/auth/tihlde";

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

    // 2. Derive admin status live from TIHLDE permissions (as Kvark does).
    //    Backend admins are automatically app admins and skip payment, so we
    //    also mark them verified/paid. A permissions fetch failure must not
    //    block login — and must not silently revoke an existing admin — so on
    //    error we leave admin-related flags untouched.
    let adminGrant: {
      isAdmin?: boolean;
      isVerified?: boolean;
      hasPaid?: boolean;
    } = {};
    try {
      const isAdmin = isAdminFromPermissions(await tihldeGetPermissions(token));
      adminGrant = isAdmin
        ? { isAdmin: true, isVerified: true, hasPaid: true }
        : { isAdmin: false };
    } catch (err) {
      console.error("[auth/login] permissions fetch failed", err);
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

    return NextResponse.json({ ok: true });
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
