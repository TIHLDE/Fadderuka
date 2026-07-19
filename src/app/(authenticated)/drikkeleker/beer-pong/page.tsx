import Footer from "~/components/layout/footer/footer";
import Link from "next/link";

export default function BeerPongPage() {
  return (
    <main
      className="relative flex min-h-screen w-full flex-col overflow-hidden"
      style={{
        backgroundColor: "var(--page-bg)",
        backgroundImage: "var(--page-gradient)",
      }}
    >

      <div className="mx-auto w-full max-w-page flex-1 !px-4 !pb-24 !pt-24 md:!px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            Beer pong
          </h1>
          <p className="!mt-4 text-base text-muted-foreground sm:text-lg">
            Dette er en enkel placeholderside. Vi legger inn reglene og
            turneringsoppsett senere.
          </p>
          <Link
            className="!mt-6 inline-flex text-sm font-semibold text-primary transition hover:text-primary/80"
            href="/drikkeleker"
          >
            {"Tilbake til drikkeleker ->"}
          </Link>
        </div>
      </div>

      <div className="mt-auto w-full -mb-8">
        <Footer />
      </div>
    </main>
  );
}
