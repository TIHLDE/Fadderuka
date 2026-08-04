import { PageHeader, PageShell } from "~/components/layout/page-shell";
import { Badge } from "~/components/ui/badge";
import GameCard from "~/components/ui/game-card";
import { Reveal, Stagger } from "~/components/ui/motion";

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
    <PageShell>
      <Reveal>
        <PageHeader
          centered
          title="Drikkeleker"
          description="Her finner du morsomme leker til aktiviteter. Kayr no pau!"
        >
          <Badge variant="secondary" className="tracking-[0.18em] uppercase">
            Fest &amp; moro
          </Badge>
        </PageHeader>
      </Reveal>

      <Stagger className="mt-4 grid gap-4 sm:grid-cols-2">
        {games.map((game) => (
          <GameCard key={game.title} {...game} />
        ))}
      </Stagger>
    </PageShell>
  );
}
