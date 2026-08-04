import { Slot } from "@radix-ui/react-slot";
import type { HTMLAttributes } from "react";
import { cn } from "~/lib/utils";

type CardProps = HTMLAttributes<HTMLElement> & {
  asChild?: boolean;
};

/**
 * Elevasjon uttrykkes med `ring-1 ring-card-border`, ikke skygge — det er
 * husreglen i Photon. Skyggen legges bare på ved hover, og da gjennom
 * `--tw-shadow` (se globals.css) så den havner under ringen.
 *
 * `data-slot="card"` er det hover-løftet i globals.css nøkler på, og det slår
 * bare inn når kortet faktisk navigerer (`a`/`button`).
 */
export function Card({ asChild = false, className, ...props }: CardProps) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      data-slot="card"
      className={cn(
        "group/card relative flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-card-border",
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
      data-slot="card-header"
      className={cn("flex flex-col gap-1 px-4", className)}
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
      data-slot="card-title"
      className={cn(
        "font-heading text-foreground text-base leading-snug font-medium",
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
    <p
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="card-content" className={cn("px-4", className)} {...props} />
  );
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-4",
        className,
      )}
      {...props}
    />
  );
}
