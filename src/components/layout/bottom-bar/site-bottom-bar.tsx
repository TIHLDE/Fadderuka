"use client";

import { LogIn, Menu, SquareArrowOutUpRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  BottomBar,
  BottomBarItem,
  bottomBarItemClasses,
} from "~/components/ui/bottom-bar";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import { TihldeLogo } from "~/components/ui/icons/tihlde";
import {
  EXTERNAL_NAV_LINKS,
  NAV_LINKS,
  getGroupLinks,
  type NavLink,
} from "../header/nav-links";

type SiteBottomBarProps = {
  isAdmin: boolean;
  isGruppeMember: boolean;
  isAuthenticated: boolean;
};

export function SiteBottomBar({
  isAdmin,
  isGruppeMember,
  isAuthenticated,
}: SiteBottomBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const closeMenu = () => setMenuOpen(false);

  // En admin kan også være fadder, så begge lenkene kan gjelde samtidig.
  // Raden har bare plass til én: admin vinner, resten ligger i menyen.
  const groupLinks = getGroupLinks(isAdmin, isGruppeMember);
  const primaryGroupLink = groupLinks[0];
  const activityLink = NAV_LINKS[1]!;

  // Menyen samler alt som ikke fikk plass i raden, så ingen side er
  // utilgjengelig fra telefon slik de var da headeren var lg-only.
  const menuLinks: NavLink[] = [
    ...NAV_LINKS,
    ...groupLinks,
    ...EXTERNAL_NAV_LINKS,
  ];

  return (
    <BottomBar className="lg:hidden">
      <div className="flex items-stretch justify-between gap-1 px-2 py-1">
        <BottomBarLink href="/" label="Hjem" pathname={pathname} exact>
          <div className="size-5">
            <TihldeLogo />
          </div>
        </BottomBarLink>

        <BottomBarLink
          href={activityLink.href}
          label="Aktiviteter"
          pathname={pathname}
        >
          <activityLink.icon />
        </BottomBarLink>

        {primaryGroupLink ? (
          <BottomBarLink
            href={primaryGroupLink.href}
            label={primaryGroupLink.href === "/admin" ? "Admin" : "Gruppe"}
            pathname={pathname}
          >
            <primaryGroupLink.icon />
          </BottomBarLink>
        ) : null}

        <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
          <DrawerTrigger asChild>
            <BottomBarItem aria-label="Åpne meny">
              <Menu />
              Meny
            </BottomBarItem>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="flex flex-row items-center gap-2">
              <div className="size-7">
                <TihldeLogo />
              </div>
              <DrawerTitle>Meny</DrawerTitle>
            </DrawerHeader>

            {/* min-h-0 lar lista faktisk scrolle innenfor drawerens maks-høyde
                i stedet for å bli klippet. */}
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 pb-8">
              {menuLinks.map((link) => (
                <MenuLink
                  key={link.href}
                  link={link}
                  pathname={pathname}
                  onNavigate={closeMenu}
                />
              ))}
              {isAuthenticated ? null : (
                <MenuLink
                  link={{
                    href: "/logg-inn",
                    label: "Logg inn",
                    icon: LogIn,
                  }}
                  pathname={pathname}
                  onNavigate={closeMenu}
                />
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </BottomBar>
  );
}

function BottomBarLink({
  href,
  label,
  pathname,
  exact = false,
  children,
}: {
  href: string;
  label: string;
  pathname: string | null;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const active = exact ? pathname === href : !!pathname?.startsWith(href);

  return (
    <Link
      href={href}
      data-slot="bottom-bar-item"
      data-status={active ? "active" : undefined}
      aria-current={active ? "page" : undefined}
      className={bottomBarItemClasses}
    >
      {children}
      {label}
    </Link>
  );
}

function MenuLink({
  link,
  pathname,
  onNavigate,
}: {
  link: NavLink;
  pathname: string | null;
  onNavigate: () => void;
}) {
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className="flex items-center gap-1 py-2"
      >
        {link.label}
        <SquareArrowOutUpRight className="size-3.5" aria-hidden />
      </a>
    );
  }

  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      aria-current={pathname === link.href ? "page" : undefined}
      className="flex items-center gap-2 py-2"
    >
      {link.label}
    </Link>
  );
}
