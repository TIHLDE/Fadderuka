export default function Hero() {
  return (
    <section className="relative w-full pt-6">
      <div className="max-w-page mx-auto w-full px-4 pt-6 pb-8 md:px-6">
        <div className="mt-8 space-y-4 text-center">
          <h1 className="font-heading text-foreground text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Velkommen til fadderuka 2026!
          </h1>
          <p className="text-muted-foreground mx-auto max-w-xl text-sm leading-relaxed sm:text-base">
            Fadderuka er to uker med aktiviteter som gir deg muligheten til å
            bli bedre kjent med de i klassen din!
          </p>
          <p className="text-muted-foreground mx-auto max-w-xl text-sm leading-relaxed sm:text-base">
            Her finner du blant annet informasjon om aktiviteter i fadderuka
            og hvilken faddergruppe du er i. Vi gleder oss til å se deg!
          </p>
        </div>
      </div>
    </section>
  );
}
