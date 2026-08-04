import { headers } from "next/headers";
import Link from "next/link";
import React from "react";
import Logo from "~/components/ui/logo";
import { ThemeToggle } from "~/components/ui/theme-mode-toggler";
import { auth } from "~/server/auth/config";
import { NotificationBell } from "./notification-bell";
import { NAV_LINKS, getGroupLink } from "./nav-links";
import { UserArea } from "../user-area";

const HeaderButtonsWrapper = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const links = [...NAV_LINKS, getGroupLink(session?.user?.isAdmin)];

  return (
    <>
      <Link href="/" aria-label="TIHLDE" className="shrink-0">
        <Logo />
      </Link>

      {/* Under md ligger de samme lenkene i bunnlinjas meny i stedet. */}
      <nav className="hidden items-center gap-1 md:flex">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-foreground hover:bg-muted rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors"
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        {session?.user ? <NotificationBell /> : null}
        <ThemeToggle aria-label="Bytt tema" variant="ghost" size="icon" />
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
