import type * as React from "react";

import { cn } from "~/lib/utils";

type SeparatorProps = React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
  /**
   * `subtle` bruker --border-subtle, som er dempet nok til seksjonsskiller
   * (footer o.l.) uten å trekke blikket.
   */
  variant?: "default" | "subtle";
};

export function Separator({
  className,
  orientation = "horizontal",
  variant = "default",
  ...props
}: SeparatorProps) {
  return (
    <div
      data-slot="separator"
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "shrink-0",
        variant === "subtle" ? "bg-border-subtle" : "bg-border",
        orientation === "horizontal" ? "h-px w-full" : "w-px self-stretch",
        className,
      )}
      {...props}
    />
  );
}
