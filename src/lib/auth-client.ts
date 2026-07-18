/**
 * Thin client-side auth helpers that talk to our own /api/auth routes, which
 * in turn proxy to TIHLDE. Replaces the previous better-auth React client.
 */

interface Result {
  error: string | null;
}

interface SignInResult extends Result {
  /** True when the user is already verified (e.g. an admin) and owes no payment. */
  verified: boolean;
}

/** New-user self-registration payload (mirrors /api/auth/register). */
export interface RegisterInput {
  full_name: string;
  email: string;
  user_id: string;
  password: string;
  study: string;
}

interface RegisterResult extends Result {
  /** Which form field the error belongs to, when the server could tell. */
  field?: string;
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
  async signIn(userId: string, password: string): Promise<SignInResult> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, password }),
    });

    if (!res.ok) {
      return {
        error: await readError(res, "Noe gikk galt ved innlogging."),
        verified: false,
      };
    }

    const body = (await res.json().catch(() => null)) as {
      verified?: boolean;
    } | null;
    return { error: null, verified: body?.verified ?? false };
  },

  /** Register a brand-new TIHLDE account and log into the app. */
  async register(input: RegisterInput): Promise<RegisterResult> {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      let field: string | undefined;
      let error = "Noe gikk galt ved registreringen.";
      try {
        const body = (await res.json()) as { error?: string; field?: string };
        error = body?.error ?? error;
        field = body?.field;
      } catch {
        // keep defaults
      }
      return { error, field };
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
