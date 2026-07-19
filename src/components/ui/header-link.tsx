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
        "text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-2 text-sm font-medium transition-colors duration-150",
        className,
      )}
      href={href}
      {...props}
    >
      {children}
    </Link>
  );
}
