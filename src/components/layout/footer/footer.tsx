import { Separator } from "~/components/ui/separator";

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.1.11 18.14.127 18.18a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const NotionIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
  </svg>
);

const mediaList = [
  { Icon: FacebookIcon, link: "https://www.facebook.com/tihlde/", label: "Facebook" },
  { Icon: InstagramIcon, link: "https://www.instagram.com/tihlde/", label: "Instagram" },
  { Icon: NotionIcon, link: "https://www.notion.so/tihlde/invite/442710f897b596ecd4f8e078cb25fcf76045125a", label: "Notion" },
  { Icon: DiscordIcon, link: "https://discord.gg/HNt5XQdyxy", label: "Discord" },
];

const attributes = [
  { key: "e-post", value: "hs@tihlde.org" },
  { key: "lokasjon", value: "c/o IDI NTNU" },
  { key: "organisasjonsnummer", value: "989 684 183" },
];

export default function Footer() {
  return (
    // Photon-idiomet: `container mx-auto px-4` med subtile separatorer i stedet
    // for kanter. Den gamle `px-12 pb-32` ga 48px sidemarg på telefon — 3× det
    // sidene selv bruker — og 128px død plass under hver eneste side.
    <footer className="bg-background text-foreground mt-auto w-full">
      <Separator variant="subtle" />

      <div className="container mx-auto grid gap-10 px-4 py-10 md:grid-cols-3">
        <div className="flex flex-col gap-3 text-center">
          <h2 className="font-heading text-sm font-semibold">Kontakt</h2>
          {attributes.map((attribute) => (
            <div key={attribute.key} className="text-sm">
              <p className="text-muted-foreground text-xs font-semibold uppercase">
                {attribute.key}
              </p>
              <p>{attribute.value}</p>
            </div>
          ))}
          <a
            href="https://tihlde.org/kontakt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-link text-sm hover:underline"
          >
            Kontakt oss
          </a>
        </div>

        <div className="flex flex-col items-center gap-8">
          <div className="flex w-full flex-col items-center gap-3">
            <a
              href="https://www.dnv.com/"
              rel="noopener noreferrer"
              target="_blank"
              className="w-full max-w-[16rem]"
            >
              {/* `w-full max-w-*` framfor den gamle faste `w-60` (240px), som
                  flommet over containeren sin på alle telefoner. */}
              <div className="dark:bg-white w-full rounded-md p-2">
                <img
                  alt="DNV"
                  className="mx-auto h-auto w-full"
                  loading="lazy"
                  src="https://cdn.onedesign.dnv.com/onedesigncdn/3.7.0/images/DNV_logo_RGB.svg"
                />
              </div>
            </a>
            <h2 className="font-heading text-sm font-semibold">
              Hovedsamarbeidspartner
            </h2>
          </div>

          <div className="flex items-center justify-center gap-6">
            {mediaList.map((media) => (
              <a
                key={media.label}
                href={media.link}
                rel="noopener noreferrer"
                target="_blank"
                aria-label={media.label}
                className="text-muted-foreground hover:text-foreground grid size-11 place-items-center transition-colors"
              >
                <media.Icon className="size-6" />
              </a>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <h2 className="font-heading text-sm font-semibold">Samarbeid</h2>
          <a
            href="https://www.nito.no/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              alt="NITO"
              className="w-28"
              loading="lazy"
              src="/nito.svg"
              width={250}
            />
          </a>
        </div>
      </div>

      <Separator variant="subtle" />

      <div className="text-muted-foreground container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-6 text-sm md:flex-row">
        <p>
          Feil på siden?{" "}
          <a
            href="https://tihlde.org/tilbakemelding"
            target="_blank"
            rel="noopener noreferrer"
            className="text-link hover:underline"
          >
            Rapporter til Index
          </a>
        </p>
        <a
          href="https://tihlde.org/personvern"
          target="_blank"
          rel="noopener noreferrer"
          className="text-link hover:underline"
        >
          Personvernerklæring
        </a>
      </div>
    </footer>
  );
}
