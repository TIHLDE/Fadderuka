import Footer from "~/components/layout/footer/footer";

const faqItems = [
  {
    question: "Når begynner studiene?",
    answer:
      "Studiene starter mandag 10. August med immatrikulering. Undervisningen starter normalt mandag 17. August. Eksakt oppstart kan variere mellom studieprogram, så sjekk timeplanen for ditt program.",
  },
  {
    question: "Hvordan finner jeg frem den første dagen?",
    answer:
      'NTNU bruker en app som heter Mazemap for å kunne orientere seg rundt på campus, rom for oppmøte finner du på studieprogramsiden på NTNU. Det vil også stå faddere med blå t-skjorter det står "TIHLDE" på som geleider dere når dere har funnet riktig bygning.',
  },
  {
    question: "Hva er TIHLDE?",
    answer:
      "TIHLDE er linjeforeningen for studenter på Digital infrastruktur og cybersikkerhet, Digital forretningsutvikling, Dataingeniør og Digital samhandling. Vi arrangerer både faglige og sosiale aktiviteter gjennom hele året.",
  },
  {
    question: "Hva er fadderukene?",
    answer:
      "Fadderukene holdes de første to ukene på studiet og funker som den store bli-kjent-perioden med mange sosiale aktiviteter i regi av deres linjeforening. Det er frivillig å delta, men er sterkt anbefalt, det er her du har muligheten til å bli kjent med medstudentene dine.",
  },
  {
    question: "Må jeg betale semesteravgift og registrere meg?",
    answer:
      "Ja. Hvert semester må du betale semesteravgiften til SiT (Studentsamskipnaden) og semesterregistrere deg i Studentweb. Dette gir deg studentstatus, gyldig studentbevis og tilgang til eksamen. Ikke vent til siste liten med å registrere seg.",
  },
  {
    question: "Hvor finner jeg faddergruppen min?",
    answer:
      "Etter skolen er ferdig med sitt opplegg mandag 10. August får dere tildelt gruppene deres og vi tar dere med på en liten runde på campus.",
  },
  {
    question: "Må jeg betale for fadderukene?",
    answer:
      "Ja. For å få delta på aktivitetene som arrangeres av linjeforeningen må du betale avgiften. Avgiften gir deg medlemskap i linjeforeningen og dekker alt det morsomme vi skal gjøre de første 2 ukene.",
  },
  {
    question: "Hvordan betaler jeg for fadderukene?",
    answer:
      "Du betaler direkte her på siden. Når du logger inn får du opp et betalingsvindu – skriv inn telefonnummeret ditt og trykk «Betal med Vipps» for å betale avgiften på 380 kr. Har du allerede betalt, men fortsatt ser betalingsvinduet, trykk «Jeg har allerede betalt» for å bekrefte betalingen.",
  },
  {
    question: "Hvorfor koster det penger å delta i fadderukene?",
    answer:
      "Fadderukene byr på to uker med et stort og variert sosialt program. Selv om arrangementene planlegges og gjennomføres av frivillige, koster det penger å leie lokaler, kjøpe inn utstyr og gjennomføre aktivitetene. Vi mottar noe støtte, men deltakerbetalingen er nødvendig for å få hele opplegget til å gå rundt. Til gjengjeld får du være med på en rekke sosiale arrangementer og aktiviteter gjennom begge ukene.",
  },
  {
    question: "Hva hvis jeg kommer for sent eller ikke finner gruppa mi?",
    answer:
      "Ta kontakt med fadderne dine eller kom bort til en av de blå TIHLDE-t-skjortene, så hjelper vi deg.",
  },
  {
    question: "Må jeg drikke alkohol?",
    answer:
      "Absolutt ikke. Mange arrangementer er helt uavhengige av alkohol, og alle skal føle seg inkludert uansett. Det viktigste er at du har det gøy.",
  },
];

const packingList = [
  "Din råeste hatt/parykk",
  "Trønderkostyme",
  "OBS! Jeg kom feil",
  "Toga laken (kjøp i god tid!)",
  "En hvit t-skjorte du kan skrive på",
  'Noe til "anything, but a cup"',
  "Klær du ikke er redd for",
  "Kostyme som begynner på forbokstav",
  "Dress/ballkjole (til immeball)",
];

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
          FAQ
        </h1>

        <div className="mt-12 space-y-10">
          {faqItems.map((item) => (
            <div key={item.question} className="space-y-2">
              <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
                {item.question}
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
                {item.answer}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 space-y-4">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Pakkeliste fadderuka
          </h2>
          <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-base sm:text-lg">
            {packingList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <Footer />
    </main>
  );
}
