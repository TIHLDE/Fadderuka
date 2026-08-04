import type { InputHTMLAttributes } from "react";
import { cn } from "~/lib/utils";

export function Input({ className, type, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        // `text-base md:text-sm`: alt under 16px får iOS til å zoome inn ved
        // fokus, så mobil beholder 16px og desktop krymper til 14px.
        "border-input text-foreground placeholder:text-muted-foreground flex h-8 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none md:text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30 dark:disabled:bg-input/80",
        // Slår ut Chromes gule autofyll-flate, som ellers overstyrer temaet.
        "autofill:[-webkit-box-shadow:0_0_0_1000px_var(--background)_inset] autofill:[-webkit-text-fill-color:var(--foreground)] autofill:[caret-color:var(--foreground)] autofill:[transition:background-color_99999s_ease-in-out_0s]",
        className
      )}
      {...props}
    />
  );
}
