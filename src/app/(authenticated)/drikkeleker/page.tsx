import Footer from "~/components/layout/footer/footer";
import GameCard from "~/components/ui/game-card";
import { Reveal } from "~/components/ui/reveal";

const games = [
  {
    title: "100 Spørsmål",
    href: "/drikkeleker/100-sporsmal",
  },
  {
    title: "Beer pong turnering",
    href: "/drikkeleker/beer-pong",
  },
];

export default function DrikkelekerPage() {
  return (
    <main
      className="relative flex min-h-screen w-full flex-col overflow-hidden text-foreground"
      style={{
        backgroundColor: "var(--page-bg)",
        backgroundImage: "var(--page-bg-image), var(--page-gradient)",
      }}
    >

      <div className="max-w-page mx-auto w-full flex-1 !px-4 !pt-24 !pb-24 md:!px-6">
        <Reveal className="flex flex-col items-center gap-4 text-center">
          <span className="border-border bg-muted/60 text-muted-foreground inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.18em] uppercase">
            Fest & moro
          </span>
          <h1 className="font-heading text-foreground text-4xl font-semibold tracking-tight sm:text-6xl md:text-7xl">
            Drikkeleker
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-base text-pretty sm:text-lg">
            Her finner du morsomme leker til aktiviteter. Kayr no pau!
          </p>
        </Reveal>

        <div className="mt-16 flex flex-wrap justify-center gap-16">
          {games.map((game, i) => (
            <Reveal key={game.title} delay={100 + i * 90}>
              <GameCard {...game} />
            </Reveal>
          ))}
        </div>
      </div>

      <div className="mt-auto w-full -mb-8">
        <Footer />
      </div>
    </main>
  );
}
