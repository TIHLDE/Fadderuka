import Logo from "~/components/ui/logo";
import { Facebook, Instagram, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0a1022] mt-8">
      <div className="mx-auto grid w-full max-w-page gap-10 px-4 py-10 mt-8 md:grid-cols-[1.2fr_1fr_1fr] md:px-6">
        <div className="space-y-4">
          <Logo />
          <div className="flex gap-3 text-slate-400">
            <Facebook className="h-6 w-6" />
            <Instagram className="h-6 w-6" />
            <MessageCircle className="h-6 w-6" />
          </div>
        </div>

        <div className="space-y-2 text-sm text-slate-400">
          <p className="text-sm font-semibold text-slate-200">Kontakt</p>
          <p>E-post</p>
          <p>hs@tihlde.org</p>
          <p>Organisasjonsnummer</p>
          <p>889 884 183</p>
          <p>Lokasjon</p>
          <p>c/o IDI NTNU</p>
        </div>

        <div className="space-y-2 text-sm text-slate-400">
          <p className="text-sm font-semibold text-slate-200">Hovedsponsor</p>
          <div className="mt-3 inline-flex items-center gap-2 text-slate-200">
            <span className="inline-block h-6 w-6 rounded-sm border border-white/20" />
            <span className="text-sm font-semibold">NITO</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
