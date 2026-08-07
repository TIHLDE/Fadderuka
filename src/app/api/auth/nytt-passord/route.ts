import { NextResponse } from "next/server";
import { z } from "zod";

import { consumableToken, consumeToken } from "~/server/auth/password-reset";
import { hashPassword } from "~/server/auth/password";

/**
 * Spend a reset link: set the new password and burn the token.
 *
 * The token in the URL is the only thing proving who this is, which is why it
 * is single-use, short-lived, and why every session on the account is dropped
 * when it is spent.
 */

const bodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Passordet må være minst 8 tegn."),
});

const INVALID = {
  error:
    "Lenka er ugyldig eller utløpt. Be om en ny på «Glemt passord»-sida.",
};

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ugyldig forespørsel." },
      { status: 400 },
    );
  }

  const stored = await consumableToken(parsed.data.token);
  if (!stored) return NextResponse.json(INVALID, { status: 400 });

  const spent = await consumeToken(
    stored.id,
    stored.userId,
    await hashPassword(parsed.data.password),
  );
  // Lost a race against another request using the same link.
  if (!spent) return NextResponse.json(INVALID, { status: 400 });

  return NextResponse.json({ ok: true, tihldeUserId: stored.user.tihldeUserId });
}
