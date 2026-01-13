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
  // Add more games as needed
];

export default function DrikkelekerPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#0f172a] via-[#0f1420] via-[84%] to-[#101013]">
      {/* Background blur effects */}
      <div className="pointer-events-none absolute -left-40 -top-32 h-[520px] w-[520px] rounded-full bg-sky-400/10 blur-[140px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[10%] h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[10%] left-[20%] h-[420px] w-[420px] rounded-full bg-slate-500/10 blur-[140px]" />

      <div className="mx-auto w-full max-w-page px-4 pb-24 pt-24 md:px-6">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-50 sm:text-6xl md:text-7xl">
            Drikkeleker
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400 sm:text-lg">
            Her finner du morsomme leker til aktiviteter. Kayr no pau!
          </p>
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-16">
          {games.map((game) => (
            <GameCard key={game.title} {...game} />
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}