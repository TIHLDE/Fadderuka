import type { LinkProps } from "next/link";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

export default async function HeaderLink({
  href,
  className,
  children,
  ...props
}: LinkProps & { children?: ReactNode; className?: string }) {
  return (
    <Link
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium text-foreground/60 transition-colors duration-150 hover:bg-accent hover:text-foreground dark:text-foreground/70 dark:hover:text-foreground",
        className,
      )}
      href={href}
      {...props}
    >
      {children}
    </Link>
  );
}
