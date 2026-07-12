import Footer from "~/components/layout/footer/footer";

export default function InformasjonPage() {
  return (
    <main
      className="relative min-h-screen w-full overflow-hidden pt-4"
      style={{
        backgroundColor: "var(--page-bg)",
        backgroundImage: "var(--page-gradient)",
      }}
    >
      <div className="pointer-events-none absolute -top-32 -left-40 h-[520px] w-[520px] rounded-full bg-sky-400/10 blur-[140px]" />
      <div className="pointer-events-none absolute top-[10%] right-[-10%] h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-[120px]" />

      <div className="max-w-page mx-auto w-full px-4 pt-24 pb-24 md:px-6">
        <h1 className="text-foreground text-4xl font-extrabold tracking-tight sm:text-6xl">
          FAQ om fadderuka
        </h1>

        <div className="mt-10 space-y-4">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Hva bør jeg vite om fadderuka 2026?
          </h2>
          <ul className="text-muted-foreground list-disc space-y-2 pl-5">
            <li>Punkt 1</li>
            <li>Punkt 2</li>
            <li>Punkt 3</li>
          </ul>
        </div>
        <div className="mt-10 space-y-4">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Hva MÅ jeg huske til fadderuka?
          </h2>
          <ul className="text-muted-foreground list-disc space-y-2 pl-5">
            <li>Punkt 1</li>
            <li>Punkt 2</li>
            <li>Punkt 3</li>
          </ul>
        </div>
        <div className="mt-10 space-y-4">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Øvrig informasjon
          </h2>
          <ul className="text-muted-foreground list-disc space-y-2 pl-5">
            <li>Punkt 1</li>
            <li>Punkt 2</li>
            <li>Punkt 3</li>
          </ul>
        </div>
      </div>

      <Footer />
    </main>
  );
}
