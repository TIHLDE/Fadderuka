import getHeaderUserContext from "../header/get-header-user-context";
import { SiteBottomBar } from "./site-bottom-bar";

/**
 * Bunnlinja for mobil. Deler sesjons- og medlemskapsoppslaget med headeren via
 * getHeaderUserContext, så gruppelenkene peker riktig (admin og/eller
 * faddergruppe) uten ekstra kall fra klienten eller en ekstra spørring.
 */
export default async function BottomBarNav() {
  const { session, isGruppeMember } = await getHeaderUserContext();

  return (
    <SiteBottomBar
      isAdmin={!!session?.user?.isAdmin}
      isGruppeMember={isGruppeMember}
      isAuthenticated={!!session?.user}
    />
  );
}
