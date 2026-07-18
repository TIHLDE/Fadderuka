"use client";

import { CalendarDays, Info, Menu, Users } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

const links = [
  { href: "/informasjon", label: "Informasjon/FAQ", icon: Info },
  { href: "/aktiviteter", label: "Aktiviteter", icon: CalendarDays },
] as const;

export function MobileNavMenu({ isAdmin }: { isAdmin?: boolean }) {
  const gruppeLink = isAdmin
    ? { href: "/admin", label: "Adminpanel", icon: Users }
    : { href: "/faddergruppe", label: "Min faddergruppe", icon: Users };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Meny"
          className="hover:bg-muted/50 hover:text-foreground rounded-md p-2 transition"
        >
          <Menu className="text-foreground h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {[...links, gruppeLink].map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href} className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
