import Link from "next/link";
import React from "react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "~/components/ui/navigation-menu";
import { ThemeSwitcher } from "~/components/ui/theme-switcher";
import { TihldeLogo } from "~/components/ui/icons/tihlde";
import { NotificationBell } from "./notification-bell";
import { NAV_LINKS, getGroupLinks } from "./nav-links";
import getHeaderUserContext from "./get-header-user-context";
import { UserArea } from "../user-area";

const HeaderButtonsWrapper = async () => {
  const { session, isGruppeMember } = await getHeaderUserContext();

  const links = [
    ...NAV_LINKS,
    ...getGroupLinks(session?.user?.isAdmin, isGruppeMember),
  ];

  return (
    <>
      <Link
        href="/"
        className="flex shrink-0 items-center"
        style={{ color: "var(--color-logo, currentColor)" }}
      >
        <TihldeLogo variant="full" className="h-5 w-auto" />
      </Link>

      {/* Under md ligger de samme lenkene i bunnlinjas meny i stedet. */}
      <NavigationMenu className="hidden md:flex">
        <NavigationMenuList>
          {links.map(({ href, label }) => (
            <NavigationMenuItem key={href}>
              <NavigationMenuLink render={<Link href={href} />}>
                {label}
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>

      <div className="flex items-center gap-2">
        {session?.user ? <NotificationBell /> : null}
        <ThemeSwitcher />
        <UserArea
          name={session?.user?.name ?? "Gjest"}
          image={session?.user?.image ?? ""}
          admin={!!session?.user?.isAdmin}
          isAuthenticated={!!session?.user}
        />
      </div>
    </>
  );
};

export default HeaderButtonsWrapper;
