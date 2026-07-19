import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE, deleteSession } from "~/server/auth/config";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await deleteSession(token);
  }
  cookieStore.delete(SESSION_COOKIE);

  return NextResponse.json({ ok: true });
}
