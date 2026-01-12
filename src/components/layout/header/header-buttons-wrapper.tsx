import HeaderLink from "~/components/ui/header-link";
import Logo from "~/components/ui/logo";
import { UserArea } from "../user-area";
import { auth } from "~/server/auth";
import { cn } from "~/lib/utils";
import { Bell, Moon, Sun } from "lucide-react";
import React from "react";

const HeaderButtonsWrapper = async ({
  className,
  ...props
}: React.HTMLProps<HTMLDivElement>) => {
  const session = await auth();

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
        <HeaderLink className="text-slate-200" href="/">
          Generelt
        </HeaderLink>
        <HeaderLink className="text-slate-400 hover:text-slate-200" href="/">
          Arrangementer
        </HeaderLink>
      </nav>

      <div className="flex items-center gap-3 text-slate-300">
        <button
          aria-label="Varsler"
          className="rounded-md p-2 transition hover:bg-white/5 hover:text-slate-100"
          type="button"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          aria-label="Lys modus"
          className="rounded-md p-2 transition hover:bg-white/5 hover:text-slate-100"
          type="button"
        >
          <Sun className="h-4 w-4" />
        </button>
        <button
          aria-label="Mork modus"
          className="rounded-md p-2 transition hover:bg-white/5 hover:text-slate-100"
          type="button"
        >
          <Moon className="h-4 w-4" />
        </button>
        <UserArea
          name={session?.user?.firstName ?? "Gjest"}
          image={session?.user?.profilePicture ?? ""}
          admin={session?.user?.role == "ADMIN"}
          isAuthenticated={!!session?.user}
        />
      </div>
    </div>
  );
};

export default HeaderButtonsWrapper;
