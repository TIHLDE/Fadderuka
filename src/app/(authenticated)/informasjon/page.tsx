import { PageShell } from "~/components/layout/page-shell";
import { Card } from "~/components/ui/card";

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
    question: "Hva skjer hvis jeg kommer for sent eller ikke finner gruppen min?",
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
  "Toga laken, IKKE MED STRETCH! (kjøp i god tid!)",
  "En hvit t-skjorte du kan skrive på",
  'Noe til "anything, but a cup"',
  "Klær du ikke er redd for",
  "Kostyme som begynner på forbokstaven din",
  "Kostyme som en artist",
  "Dress/ballkjole (til immeball)",
];

export default function InformasjonPage() {
  return (
    <PageShell>
      {/* Sidekolonnen er 22rem, som i Photons DetailPage, og limes fast rett
          under den 56px høye headeren. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex flex-col gap-8">
          <h1 className="font-heading text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
            FAQ
          </h1>
          {faqItems.map((item) => (
            <div key={item.question} className="flex flex-col gap-2">
              <h2 className="font-heading text-foreground text-lg font-medium tracking-tight sm:text-xl">
                {item.question}
              </h2>
              {/* Svarene er sidens hovedinnhold, så de står i --foreground.
                  Photon mapper `.prose`-brødtekst til samme token og holder
                  --muted-foreground til sekundær tekst. */}
              <p className="text-foreground/90 text-base leading-relaxed">
                {item.answer}
              </p>
            </div>
          ))}
        </div>

        <aside className="lg:sticky lg:top-20">
          <Card className="flex flex-col gap-4 p-4">
            <h2 className="font-heading text-foreground text-lg font-medium tracking-tight">
              Pakkeliste fadderuka
            </h2>
            <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm">
              {packingList.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </PageShell>
  );
}
