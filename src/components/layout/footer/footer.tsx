import Logo from "~/components/ui/logo";
import { Facebook, Instagram, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-8">
      <div className="mx-auto grid w-full max-w-page gap-10 px-4 py-10 mt-8 md:grid-cols-[1.2fr_1fr_1fr] md:px-6">
        <div className="space-y-4">
          <Logo />
          <div className="flex gap-3 text-muted-foreground">
            <Facebook className="h-6 w-6" />
            <Instagram className="h-6 w-6" />
            <MessageCircle className="h-6 w-6" />
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="text-sm font-semibold text-card-foreground">Kontakt</p>
          <p>E-post</p>
          <p>hs@tihlde.org</p>
          <p>Organisasjonsnummer</p>
          <p>889 884 183</p>
          <p>Lokasjon</p>
          <p>c/o IDI NTNU</p>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="text-sm font-semibold text-card-foreground">Hovedsponsor</p>
          <div className="mt-3 inline-flex items-center gap-2 text-card-foreground">
            <span className="inline-block h-6 w-6 rounded-sm border border-border" />
            <span className="text-sm font-semibold">NITO</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
