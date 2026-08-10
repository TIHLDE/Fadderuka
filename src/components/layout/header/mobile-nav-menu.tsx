"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { NAV_LINKS, getGroupLinks } from "./nav-links";

export function MobileNavMenu({
  isAdmin,
  isGruppeMember,
}: {
  isAdmin?: boolean;
  isGruppeMember?: boolean;
}) {
  const links = [...NAV_LINKS, ...getGroupLinks(isAdmin, isGruppeMember)];

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
        {links.map(({ href, label, icon: Icon }) => (
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
