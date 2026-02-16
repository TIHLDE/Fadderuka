import type { HTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "~/lib/utils";

type CardProps = HTMLAttributes<HTMLElement> & {
  asChild?: boolean;
};

export function Card({ asChild = false, className, ...props }: CardProps) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      className={cn(
        "relative overflow-hidden rounded-xl",
        "border border-[color:var(--card-border)]",
        "bg-[color:var(--surface-soft)]",
        "transition",

        "shadow-[0_0_0_1px_var(--card-border)]",

        "hover:border-[color:var(--card-border-strong)]",
        "hover:shadow-[0_0_0_1px_var(--card-border-strong),0_24px_80px_-40px_rgba(115,170,196,0.45)]",

        "before:pointer-events-none before:absolute before:inset-0",
        "before:bg-[radial-gradient(600px_160px_at_50%_-40px,var(--card-sheen),transparent_60%)]",
        "before:opacity-70",

        className
      )}
      {...props}
    />
  );
}
