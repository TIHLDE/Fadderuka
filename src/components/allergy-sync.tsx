"use client";

import { useEffect } from "react";

import { PENDING_ALLERGY_KEY } from "~/lib/pending-allergy";

/**
 * Flushes a buffered allergy (collected during self-registration) onto the
 * user's TIHLDE profile once the session carries a real TIHLDE token. Rendered
 * inside the authenticated layout so it runs on authenticated loads. It keeps
 * the buffer and retries until the server confirms it synced, so a pending
 * account (no token yet) simply tries again after activation + TIHLDE login.
 */
export default function AllergySync() {
  useEffect(() => {
    let allergy: string | null = null;
    try {
      allergy = localStorage.getItem(PENDING_ALLERGY_KEY);
    } catch {
      return;
    }
    if (!allergy) return;

    void (async () => {
      try {
        const res = await fetch("/api/profile/allergy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allergy }),
        });
        if (!res.ok) return; // keep the buffer, retry on a later load
        const body = (await res.json().catch(() => null)) as {
          synced?: boolean;
        } | null;
        if (body?.synced) localStorage.removeItem(PENDING_ALLERGY_KEY);
      } catch {
        // Network error — keep the buffer and retry on the next load.
      }
    })();
  }, []);

  return null;
}
