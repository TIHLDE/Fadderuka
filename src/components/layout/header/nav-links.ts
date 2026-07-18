import { CalendarDays, Info, Users, type LucideIcon } from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Nav-lenker som er felles for desktop- og mobil-headeren. */
export const NAV_LINKS: NavLink[] = [
  { href: "/informasjon", label: "Informasjon/FAQ", icon: Info },
  { href: "/aktiviteter", label: "Aktiviteter", icon: CalendarDays },
];

/** Siste nav-lenke avhenger av om brukeren er admin. */
export function getGroupLink(isAdmin?: boolean): NavLink {
  return isAdmin
    ? { href: "/admin", label: "Adminpanel", icon: Users }
    : { href: "/faddergruppe", label: "Min faddergruppe", icon: Users };
}
