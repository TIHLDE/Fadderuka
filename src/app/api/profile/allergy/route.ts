import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "~/server/auth/config";
import { db } from "~/server/db";

/**
 * Store a user's food allergies.
 *
 * These used to be written onto the TIHLDE profile, because Lepton held them as
 * free text. Photon does not: it models allergies as a fixed list of slugs, and
 * "laktose, litt nøtter" has nowhere to go in that. So the answer is kept here,
 * which is also where it gets used — FadderKom orders the food.
 *
 * Self-registration collects the allergy before the session exists, so the
 * client buffers it and POSTs on a later authenticated load. It always
 * succeeds now; `synced` stays in the response so the client contract is
 * unchanged.
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

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { allergy: parsed.data.allergy },
    });
    return NextResponse.json({ synced: true });
  } catch (err) {
    console.error("[profile/allergy] unexpected error", err);
    return NextResponse.json(
      { error: "Kunne ikke lagre allergiene dine." },
      { status: 500 },
    );
  }
}
