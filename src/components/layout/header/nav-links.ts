import { CalendarDays, Info, Users, type LucideIcon } from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Nav-lenker som er felles for desktop-headeren og mobilmenyen. */
export const NAV_LINKS: NavLink[] = [
  { href: "/informasjon", label: "Informasjon/FAQ", icon: Info },
  { href: "/aktiviteter", label: "Aktiviteter", icon: CalendarDays },
];

/**
 * Nav-lenker for admin/faddergruppe avhenger av rollene brukeren har.
 * Disse er ikke gjensidig utelukkende: en admin som også er medlem av en
 * faddergruppe skal se begge lenkene.
 */
export function getGroupLinks(
  isAdmin?: boolean,
  isGruppeMember?: boolean,
): NavLink[] {
  const links: NavLink[] = [];
  if (isAdmin) {
    links.push({ href: "/admin", label: "Adminpanel", icon: Users });
  }
  if (isGruppeMember) {
    links.push({
      href: "/faddergruppe",
      label: "Min faddergruppe",
      icon: Users,
    });
  }
  return links;
}
