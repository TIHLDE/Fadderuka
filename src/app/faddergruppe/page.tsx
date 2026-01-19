import Footer from "~/components/layout/footer/footer";
import { Plus, ThumbsDown, ThumbsUp } from "lucide-react";

const fosterChildren = [
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

const mentors = [
  { name: "Jan Olsen", phone: "+47 941 13 131" },
  { name: "Per Per", phone: "+47 911 48 144" },
  { name: "Ola Jansen", phone: "+47 488 48 488" },
];

type Message = {
  name: string;
  time: string;
  body: string;
  reactions?: {
    likes: number;
    dislikes: number;
  };
};

const messages: Message[] = [
  {
    name: "Jan Olsen",
    time: "15:44",
    body: "Møt opp i Faddergata 8a klokken 19:00! Ta med all drikken du har!",
    reactions: { likes: 5, dislikes: 2 },
  },
  {
    name: "Ola Jansen",
    time: "2 dager siden",
    body: "Velkommen til Tihlde og faddergruppe 5! Den beste faddergruppa!",
  },
];

function MessageCard({ name, time, body, reactions }: Message) {
  return (
    <article className="rounded-xl border border-[#73aac4]/70 bg-[color:var(--surface-soft)] !p-6 shadow-[0_24px_60px_rgba(4,10,23,0.35)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between !gap-3">
        <h3 className="text-lg font-extrabold text-white sm:text-xl">{name}</h3>
        <span className="text-sm font-medium text-[#8694b4] sm:text-base">
          {time}
        </span>
      </div>
      <p className="!mt-3 text-base font-medium text-[#8694b4] sm:text-lg">
        {body}
      </p>
      {reactions ? (
        <div className="!mt-4 flex items-center !gap-6 text-white">
          <div className="flex items-center !gap-2 text-lg font-medium">
            <span>{reactions.likes}</span>
            <ThumbsUp className="h-4 w-4" />
          </div>
          <div className="flex items-center !gap-2 text-lg font-medium">
            <span>{reactions.dislikes}</span>
            <ThumbsDown className="h-4 w-4" />
          </div>
        </div>
      ) : null}
    </article>
  );
}

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
                  {fosterChildren.map((child, index) => (
                    <li key={`${child}-${index}`}>{child}</li>
                  ))}
                </ul>
              </div>
              <div className="!space-y-4">
                <h3 className="text-lg font-semibold text-white">Faddere</h3>
                <div className="grid !gap-2 text-sm text-[#7f8fb2] sm:text-base">
                  {mentors.map((mentor) => (
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

          <section className="!space-y-6">
            <div className="flex flex-wrap items-end justify-between !gap-4">
              <h2 className="text-3xl font-extrabold tracking-[-0.02em] text-white sm:text-[36px]">
                Melding fra fadderne
              </h2>
              <button
                className="inline-flex items-center !gap-2 rounded-xl border border-[#73aac4] bg-[#212d49] !px-4 !py-2 text-sm font-semibold text-white transition hover:bg-[#29385a] sm:text-base"
                type="button"
              >
                <Plus className="h-4 w-4" />
                Ny melding
              </button>
            </div>

            <div className="!space-y-4">
              {messages.map((message) => (
                <MessageCard
                  key={`${message.name}-${message.time}`}
                  {...message}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-auto w-full">
        <Footer />
      </div>
    </main>
  );
}
