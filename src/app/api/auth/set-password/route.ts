import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth, needsLocalPassword } from "~/server/auth/config";
import { hashPassword } from "~/server/auth/password";
import { db } from "~/server/db";

/**
 * Let a logged-in user choose a local password for this app.
 *
 * Only for accounts that depend on the local login bridge: they registered
 * here before we started storing a password hash, so nothing can authenticate
 * them once the current session expires. The live session is what proves who
 * they are — asking for a username alone would let anyone claim an account,
 * since the username is their Feide name and not a secret.
 *
 * The password is local to this app; tihlde.org keeps whatever password the
 * account already has there.
 */

const bodySchema = z.object({
  password: z.string().min(8, "Passordet må være minst 8 tegn."),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Du er ikke logget inn." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ugyldig passord." },
      { status: 400 },
    );
  }

  if (!needsLocalPassword(session)) {
    // Either they already have a local password, or TIHLDE authenticates them
    // and owns their password. Nothing to do here in both cases.
    return NextResponse.json(
      { error: "Kontoen din trenger ikke et eget passord her." },
      { status: 400 },
    );
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.password),
      passwordIsTemporary: false,
    },
  });

  return NextResponse.json({ ok: true });
}
