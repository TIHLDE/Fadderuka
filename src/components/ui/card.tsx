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
        "bg-card text-card-foreground",
        "ring-1 ring-foreground/10",
        "transition-colors",
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
        "font-heading text-foreground text-xl leading-snug font-medium tracking-tight",
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
