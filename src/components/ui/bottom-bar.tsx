import * as React from "react";

import { cn } from "~/lib/utils";

function BottomBar({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      data-slot="bottom-bar"
      className={cn(
        // `pb-[env(safe-area-inset-bottom)]` holder raden klar av iOS-
        // homeindikatoren, som ellers legger seg rett oppå etikettene.
        "fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/70",
        className,
      )}
      {...props}
    />
  );
}

type BottomBarItemProps = React.ComponentProps<"button"> & {
  asChild?: boolean;
};

const bottomBarItemClasses =
  // Den aktive raden markeres med data-status="active" — alt annet (menyknappen)
  // får rett og slett aldri attributtet.
  "flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[0.6875rem] font-medium text-muted-foreground outline-none transition-colors select-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[status=active]:text-foreground [&_svg]:size-5 [&_svg]:shrink-0";

function BottomBarItem({ className, ...props }: BottomBarItemProps) {
  return (
    <button
      type="button"
      data-slot="bottom-bar-item"
      className={cn(bottomBarItemClasses, className)}
      {...props}
    />
  );
}

export { BottomBar, BottomBarItem, bottomBarItemClasses };
