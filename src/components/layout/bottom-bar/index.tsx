import { headers } from "next/headers";

import { auth } from "~/server/auth/config";
import { SiteBottomBar } from "./site-bottom-bar";

/**
 * Bunnlinja for mobil. Henter sesjonen på serveren slik headeren gjør, så
 * gruppelenka peker riktig (admin vs. faddergruppe) uten et ekstra kall fra
 * klienten.
 */
export default async function BottomBarNav() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <SiteBottomBar
      isAdmin={!!session?.user?.isAdmin}
      isAuthenticated={!!session?.user}
    />
  );
}
