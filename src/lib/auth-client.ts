/**
 * Thin client-side auth helpers that talk to our own /api/auth routes, which
 * in turn proxy to TIHLDE. Replaces the previous better-auth React client.
 */

interface Result {
  error: string | null;
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body?.error ?? fallback;
  } catch {
    return fallback;
  }
}

export const authClient = {
  /** Log in with a TIHLDE username + password. */
  async signIn(userId: string, password: string): Promise<Result> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, password }),
    });

    if (!res.ok) {
      return { error: await readError(res, "Noe gikk galt ved innlogging.") };
    }
    return { error: null };
  },

  /** Destroy the current session. */
  async signOut(): Promise<Result> {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (!res.ok) {
      return { error: await readError(res, "Noe gikk galt ved utlogging.") };
    }
    return { error: null };
  },
};
