import { headers } from "next/headers";
import React from "react";
import HeaderLink from "~/components/ui/header-link";
import Logo from "~/components/ui/logo";
import { ThemeToggle } from "~/components/ui/theme-mode-toggler";
import { cn } from "~/lib/utils";
import { auth } from "~/server/auth/config";
import { NotificationBell } from "./notification-bell";
import { UserArea } from "../user-area";

const HeaderButtonsWrapper = async ({
  className,
  ...props
}: React.HTMLProps<HTMLDivElement>) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div
      {...props}
      className={cn(
        "flex h-full w-full items-center justify-between",
        className,
      )}
    >
      <nav className="flex items-center gap-8">
        <HeaderLink
          href="/"
          className="mr-10 p-0 hover:bg-transparent"
          aria-label="TIHLDE"
        >
          <Logo />
        </HeaderLink>
        <HeaderLink
          className="text-foreground text-base font-bold tracking-tight hover:text-sky-600 dark:hover:text-sky-300"
          href="/informasjon"
        >
          Informasjon/FAQ
        </HeaderLink>
        <HeaderLink
          className="text-foreground text-base font-bold tracking-tight hover:text-sky-600 dark:hover:text-sky-300"
          href="/aktiviteter"
        >
          Aktiviteter
        </HeaderLink>
        {session?.user?.isAdmin ? (
          <HeaderLink
            className="text-foreground text-base font-bold tracking-tight hover:text-sky-600 dark:hover:text-sky-300"
            href="/admin"
          >
            Adminpanel
          </HeaderLink>
        ) : (
          <HeaderLink
            className="text-foreground text-base font-bold tracking-tight hover:text-sky-600 dark:hover:text-sky-300"
            href="/faddergruppe"
          >
            Min faddergruppe
          </HeaderLink>
        )}
      </nav>

      <div className="text-muted-foreground flex items-center gap-3">
        {session?.user ? <NotificationBell /> : null}
        <ThemeToggle
          aria-label="Bytt tema"
          className="text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-md border-transparent bg-transparent p-2"
          variant="ghost"
          size="icon"
        />
        <UserArea
          name={session?.user?.name ?? "Gjest"}
          image={session?.user?.image ?? ""}
          admin={!!session?.user?.isAdmin}
          isAuthenticated={!!session?.user}
        />
      </div>
    </div>
  );
};

export default HeaderButtonsWrapper;
