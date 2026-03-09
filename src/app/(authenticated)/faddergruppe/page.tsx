import Footer from "~/components/layout/footer/footer";
import MessagesSection from "./messages-section";

const fadderChildren = [
  "Jan Olsen",
  "Per Per",
  "Ola Jansen",
  "Jan Olsen",
  "Per Per",
  "Ola Jansen",
  "Jan Olsen",
  "Per Per",
  "Ola Jansen",
  "Jan Olsen",
  "Per Per",
];

const Faddere = [
  { name: "Jan Olsen", phone: "+47 941 13 131" },
  { name: "Per Per", phone: "+47 911 48 144" },
  { name: "Ola Jansen", phone: "+47 488 48 488" },
];

export default function FaddergroupPage() {
  return (
    <main
      className="relative flex min-h-screen w-full flex-1 flex-col overflow-hidden text-white"
      style={{
        backgroundColor: "var(--page-bg)",
        backgroundImage: "var(--page-bg-image), var(--page-gradient)",
      }}
    >
      <div className="pointer-events-none absolute top-[-280px] left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(100,149,230,0.35),transparent_70%)] blur-3xl" />
      <div className="pointer-events-none absolute top-[180px] right-[-260px] h-[460px] w-[620px] rotate-[-20deg] rounded-[45%] bg-[radial-gradient(circle,rgba(144,223,237,0.28),transparent_72%)] blur-3xl" />
      <div className="pointer-events-none absolute top-[360px] left-[-320px] h-[520px] w-[760px] rotate-12 rounded-[50%] bg-[radial-gradient(circle,rgba(73,120,179,0.22),transparent_70%)] blur-[120px]" />

      <div className="max-w-page relative mx-auto flex w-full flex-1 flex-col !px-4 !pt-24 !pb-16 md:!px-6">
        <div className="mx-auto flex w-full max-w-[1040px] flex-col !gap-12">
          <section className="!space-y-5">
            <h1 className="bg-gradient-to-r from-[#90dfed] to-[#6495e6] bg-clip-text text-4xl leading-[1.15] font-bold text-transparent md:text-5xl">
              Faddergruppe 5
            </h1>
            <p className="max-w-3xl text-base text-[#8694b4] sm:text-lg">
              Velkommen til faddergruppe 5! Her finner du en oversikt over alle
              faddere og fadderbarn i tillegg til informasjon fra fadderne til
              faddergruppa.
            </p>
          </section>

          <section className="!space-y-6">
            <h2 className="text-3xl font-extrabold tracking-[-0.02em] text-white sm:text-[36px]">
              Medlemmer
            </h2>
            <div className="grid !gap-10 rounded-xl border border-[#73aac4]/70 bg-[color:var(--surface-soft)] !p-6 shadow-[0_24px_60px_rgba(4,10,23,0.35)] backdrop-blur md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:!gap-16">
              <div className="!space-y-4">
                <h3 className="text-lg font-semibold text-white">Fadderbarn</h3>
                <ul className="!space-y-2 text-sm text-[#7f8fb2] sm:text-base">
                  {fadderChildren.map((child, index) => (
                    <li key={`${child}-${index}`}>{child}</li>
                  ))}
                </ul>
              </div>
              <div className="!space-y-4">
                <h3 className="text-lg font-semibold text-white">Faddere</h3>
                <div className="grid !gap-2 text-sm text-[#7f8fb2] sm:text-base">
                  {Faddere.map((mentor) => (
                    <div
                      key={mentor.phone}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center !gap-6"
                    >
                      <span>{mentor.name}</span>
                      <span className="text-right">{mentor.phone}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <MessagesSection />
        </div>
      </div>

      <div className="mt-auto w-full">
        <Footer />
      </div>
    </main>
  );
}
