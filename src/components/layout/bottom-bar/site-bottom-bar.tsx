"use client";

import { Home, LogIn, Menu } from "lucide-react";
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
import { ThemeToggle } from "~/components/ui/theme-mode-toggler";
import { cn } from "~/lib/utils";
import {
  NAV_LINKS,
  SECONDARY_NAV_LINKS,
  getGroupLink,
  type NavLink,
} from "../header/nav-links";

type SiteBottomBarProps = {
  isAdmin: boolean;
  isAuthenticated: boolean;
};

export function SiteBottomBar({
  isAdmin,
  isAuthenticated,
}: SiteBottomBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const closeMenu = () => setMenuOpen(false);

  const groupLink = getGroupLink(isAdmin);
  const activityLink = NAV_LINKS[1]!;

  // Menyen samler alt som ikke fikk plass i raden, så ingen side er
  // utilgjengelig fra telefon slik de var da headeren var lg-only.
  const menuLinks: NavLink[] = [
    ...NAV_LINKS,
    groupLink,
    ...SECONDARY_NAV_LINKS,
  ];

  return (
    <BottomBar className="md:hidden">
      <div className="flex items-stretch justify-between gap-1 px-2 py-1">
        <BottomBarLink href="/" label="Hjem" pathname={pathname} exact>
          <Home />
        </BottomBarLink>

        <BottomBarLink
          href={activityLink.href}
          label="Aktiviteter"
          pathname={pathname}
        >
          <activityLink.icon />
        </BottomBarLink>

        <BottomBarLink
          href={groupLink.href}
          label={isAdmin ? "Admin" : "Gruppe"}
          pathname={pathname}
        >
          <groupLink.icon />
        </BottomBarLink>

        <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
          <DrawerTrigger asChild>
            <BottomBarItem aria-label="Åpne meny">
              <Menu />
              Meny
            </BottomBarItem>
          </DrawerTrigger>
          <DrawerContent className="max-h-[80vh]">
            <DrawerHeader className="flex flex-row items-center justify-between gap-2">
              <DrawerTitle>Meny</DrawerTitle>
              <ThemeToggle
                aria-label="Bytt tema"
                variant="ghost"
                size="icon"
                className="size-9"
              />
            </DrawerHeader>

            {/* min-h-0 lar lista faktisk scrolle innenfor drawerens maks-høyde
                i stedet for å bli klippet. */}
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
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
  const active = pathname === link.href;

  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <link.icon className="size-4 shrink-0" />
      {link.label}
    </Link>
  );
}
