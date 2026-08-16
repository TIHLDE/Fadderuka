import {
  Beer,
  CalendarDays,
  Info,
  Megaphone,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Peker ut av appen — åpnes i ny fane og merkes med et eksternt-ikon. */
  external?: boolean;
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

/** Eksterne lenker som ligger sist i navigasjonen, som i Photon. */
export const EXTERNAL_NAV_LINKS: NavLink[] = [
  {
    href: "https://forms.gle/UE85Da8et8VJc7XWA",
    label: "Varsling",
    icon: Megaphone,
    external: true,
  },
];

/**
 * Lenker som bare vises i mobilmenyen. /drikkeleker har aldri hatt en vei inn
 * fra navigasjonen — siden var bare tilgjengelig ved å skrive URL-en.
 */
export const SECONDARY_NAV_LINKS: NavLink[] = [
  { href: "/drikkeleker", label: "Drikkeleker", icon: Beer },
];
