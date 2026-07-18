import Footer from "~/components/layout/footer/footer";
import GameCard from "~/components/ui/game-card";

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
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl md:text-7xl">
            Drikkeleker
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Her finner du morsomme leker til aktiviteter. Kayr no pau!
          </p>
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-16">
          {games.map((game) => (
            <GameCard key={game.title} {...game} />
          ))}
        </div>
      </div>

      <div className="mt-auto w-full -mb-8">
        <Footer />
      </div>
    </main>
  );
}
