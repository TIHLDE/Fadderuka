import { Reveal } from "~/components/ui/motion";

export default function Hero() {
  return (
    <section className="relative w-full overflow-hidden pt-6">
      {/* Subtle brand glow behind the hero — single, soft, feature-gated */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-140px] left-1/2 -z-10 h-[440px] w-[min(760px,90vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_18%,transparent),transparent)] blur-2xl animate-glow-breathe motion-reduce:animate-none"
      />

      <div className="container mx-auto w-full px-4 py-10">
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
          {/* Lar tittelen brekke. Den gamle `whitespace-nowrap` tvang 23 tegn
              på én linje, som med 6.2vw krympet H1-en til ~20px på telefon —
              mindre enn brødteksten på FAQ-siden. */}
          <h1 className="font-heading text-foreground text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl">
            Velkommen til fadderuka
          </h1>

          <p className="text-muted-foreground mx-auto max-w-xl text-sm leading-relaxed text-pretty sm:text-base">
            Fadderuka er to uker med aktiviteter som gir deg muligheten til å
            bli bedre kjent med de i klassen din!
          </p>
          <p className="text-muted-foreground mx-auto max-w-xl text-sm leading-relaxed text-pretty sm:text-base">
            Her finner du blant annet informasjon om aktiviteter i fadderuka
            og hvilken faddergruppe du er i. Vi gleder oss til å se deg!
          </p>
        </Reveal>
      </div>
    </section>
  );
}
