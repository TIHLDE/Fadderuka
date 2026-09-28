// Kopiert fra Photon: packages/ui/src/components/ui/textarea.tsx
import * as React from "react";

import { cn } from "~/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      // Be Grammarly holde seg unna. Utvidelsen overtar felt den kobler
      // seg på og slår av nettleserens egen stavekontroll, men retter
      // bare engelsk — på et norsk felt blir resultatet ingen rød strek
      // i det hele tatt. Uten Grammarly gjør attributtene ingenting, og
      // spreaden under lar den som trenger det overstyre.
      data-gramm="false"
      data-gramm_editor="false"
      data-enable-grammarly="false"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex field-sizing-content min-h-16 w-full rounded-lg border bg-transparent px-2.5 py-2 text-base transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
