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
        "hover:bg-primary/5 hover:text-primary rounded-md p-2 text-sm font-medium text-zinc-500 transition-colors duration-150 dark:text-zinc-300",
        className,
      )}
      href={href}
      {...props}
    >
      {children}
    </Link>
  );
}
