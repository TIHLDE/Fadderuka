import { Facebook, Instagram } from "lucide-react";

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
  { Icon: Facebook, link: "https://www.facebook.com/tihlde/", label: "Facebook" },
  { Icon: Instagram, link: "https://www.instagram.com/tihlde/", label: "Instagram" },
  { Icon: NotionIcon, link: "https://www.notion.so/tihlde/invite/442710f897b596ecd4f8e078cb25fcf76045125a", label: "Notion" },
  { Icon: DiscordIcon, link: "https://discord.gg/HNt5XQdyxy", label: "Discord" },
];

const attributes = [
  { key: "E-post", value: "hs@tihlde.org" },
  { key: "Lokasjon", value: "c/o IDI NTNU" },
  { key: "Organisasjonsnummer", value: "989 684 183" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-[color:var(--footer-bg)] px-6 pt-6 pb-32 md:px-40 md:py-20">
      <div className="space-y-12">
        <div className="flex flex-col space-y-12 lg:flex-row lg:space-y-0 lg:justify-between">
          <div className="order-last space-y-4 lg:order-first lg:w-[250px]">
            <h2 className="text-center text-3xl font-semibold text-foreground">Kontakt</h2>
            {attributes.map((attribute) => (
              <div className="text-center" key={attribute.key}>
                <p className="text-sm font-semibold uppercase text-foreground">{attribute.key}</p>
                <p className="text-muted-foreground">{attribute.value}</p>
              </div>
            ))}
            <p className="text-center">
              <a
                href="https://tihlde.org/kontakt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Kontakt oss
              </a>
            </p>
          </div>

          <div className="w-full space-y-12 lg:max-w-sm">
            <div className="space-y-4">
              <a
                href="https://www.dnv.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mx-auto flex justify-center"
              >
                <div className="w-fit rounded-md p-2 dark:bg-white">
                  <img
                    alt="DNV"
                    className="mx-auto w-60 md:w-72"
                    loading="lazy"
                    src="https://cdn.onedesign.dnv.com/onedesigncdn/3.7.0/images/DNV_logo_RGB.svg"
                  />
                </div>
              </a>
              <p className="text-center text-lg text-foreground">Hovedsamarbeidspartner</p>
            </div>

            <div className="space-y-4">
              <div className="border-t border-border" />
              <div className="grid grid-cols-2 place-items-center gap-y-6 lg:flex lg:items-center">
                {mediaList.map((media) => (
                  <a
                    key={media.label}
                    className="mx-8 text-muted-foreground transition-colors hover:text-foreground"
                    href={media.link}
                    rel="noopener noreferrer"
                    target="_blank"
                    aria-label={media.label}
                  >
                    <media.Icon className="size-8" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="pb-12 lg:w-[250px] lg:pb-0">
            <h2 className="mb-4 text-center text-3xl font-semibold text-foreground">Samarbeid</h2>
            <a href="https://www.nito.no/" target="_blank" rel="noopener noreferrer">
              <img
                alt="NITO"
                className="mx-auto mt-4 w-28"
                loading="lazy"
                src="https://www.nito.no/globalassets/logoer/nito-logo-rod.svg"
                width={250}
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
