import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "~/server/auth/config";
import { TihldeAuthError, tihldeUpdateAllergy } from "~/server/auth/tihlde";

/**
 * Persist a user's food allergies onto their TIHLDE profile (Lepton owns the
 * data — we don't store it locally). Self-registration collects the allergy but
 * the fresh account is pending and has no TIHLDE token, so the client buffers it
 * and POSTs here on later authenticated loads. We only succeed once the session
 * carries a real TIHLDE token (i.e. after activation + a TIHLDE login); until
 * then we report `synced: false` so the client keeps the buffer and retries.
 */

const bodySchema = z.object({
  allergy: z.string().trim().min(1).max(500),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ugyldig allergi." }, { status: 400 });
  }

  // Pending accounts have no TIHLDE token yet — nothing we can do until the user
  // is activated and logs in via TIHLDE. Tell the client to keep buffering.
  const token = session.session.tihldeToken;
  if (!token) {
    return NextResponse.json({ synced: false });
  }

  try {
    await tihldeUpdateAllergy(token, session.user.tihldeUserId, parsed.data.allergy);
    return NextResponse.json({ synced: true });
  } catch (err) {
    if (err instanceof TihldeAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[profile/allergy] unexpected error", err);
    return NextResponse.json(
      { error: "Kunne ikke lagre allergiene dine." },
      { status: 500 },
    );
  }
}
