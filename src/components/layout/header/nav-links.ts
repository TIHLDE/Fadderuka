import {
  Beer,
  CalendarDays,
  Info,
  Users,
  type LucideIcon,
} from "lucide-react";

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

/** Siste nav-lenke avhenger av om brukeren er admin. */
export function getGroupLink(isAdmin?: boolean): NavLink {
  return isAdmin
    ? { href: "/admin", label: "Adminpanel", icon: Users }
    : { href: "/faddergruppe", label: "Min faddergruppe", icon: Users };
}

/**
 * Lenker som bare vises i mobilmenyen. /drikkeleker har aldri hatt en vei inn
 * fra navigasjonen — siden var bare tilgjengelig ved å skrive URL-en.
 */
export const SECONDARY_NAV_LINKS: NavLink[] = [
  { href: "/drikkeleker", label: "Drikkeleker", icon: Beer },
];
