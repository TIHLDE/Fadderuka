import { Slot } from "@radix-ui/react-slot";
import type { HTMLAttributes } from "react";
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

        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-foreground text-xl leading-none font-semibold tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-muted-foreground text-sm", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center", className)}
      {...props}
    />
  );
}
