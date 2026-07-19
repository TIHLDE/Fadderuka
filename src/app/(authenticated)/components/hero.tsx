import { Reveal } from "~/components/ui/reveal";

export default function Hero() {
  return (
    <section className="relative w-full overflow-hidden pt-6">
      {/* Subtle brand glow behind the hero — single, soft, feature-gated */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-140px] left-1/2 -z-10 h-[440px] w-[min(760px,90vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.18),transparent)] blur-2xl animate-glow-breathe motion-reduce:animate-none"
      />

      <div className="max-w-page mx-auto w-full px-4 pt-10 pb-10 md:px-6">
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
          <h1 className="font-heading text-foreground text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
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
