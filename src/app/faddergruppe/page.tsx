import Footer from "~/components/layout/footer/footer";
import Medlemmer from "~/components/ui/faddergruppe/medlemmer-card";

// Mock data - replace with real data from backend later
const faddergruppeData = {
  number: 5,
  fadderbarn: [
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
  ],
  faddere: [
    { name: "Jan Olsen", phone: "+47 941 13 131" },
    { name: "Per Per", phone: "+47 911 48 144" },
    { name: "Ola Jansen", phone: "+47 488 48 488" },
  ],
};

export default function FaddergruppeOversiktPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background">
        <div className="m-8">
      {/* Background blur effects */}
      <div className="pointer-events-none absolute -left-40 -top-32 h-[520px] w-[520px] rounded-full bg-sky-400/10 blur-[140px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[10%] h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[10%] left-[20%] h-[420px] w-[420px] rounded-full bg-slate-500/10 blur-[140px]" />

      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <div className="mb-12 mt-12">
          <h1 
            className="mb-4 text-[44px] font-bold leading-[72px] tracking-normal"
            style={{
              background: 'linear-gradient(90deg, #90DFED 0%, #6495E6 30%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Faddergruppe {faddergruppeData.number}
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
              Velkommen til faddergruppe {faddergruppeData.number}! Her finner du en oversikt over alle faddere og fadderbarn i tillegg til informasjon fra fadderne til faddergruppe.
          </p>
        </div>
        
        <h2 className="mb-8 text-[32px] font-bold leading-[48px] text-foreground">
            Medlemmer
        </h2>
        
        {/* Medlemmer Component */}
        <Medlemmer 
          fadderbarn={faddergruppeData.fadderbarn}
          faddere={faddergruppeData.faddere}
        />

        <h2 className="mb-8 text-[32px] font-bold leading-[48px] text-white mt-12">
            Melding fra fadderne
        </h2>
      </div>
      </div>

      <Footer />
    </main>
  );
}