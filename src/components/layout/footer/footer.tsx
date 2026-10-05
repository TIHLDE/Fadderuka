// Kopiert fra Photon: apps/kvark/src/components/site-footer.tsx. Avvik: interne
// lenker peker til tihlde.org, siden sidene ligger der, og fadderuka beholder
// Notion- og Discord-lenkene, «Kontakt oss» og «Rapporter til Index» fra den
// gamle footeren — det er der nye studenter finner fram.
import { Facebook, Instagram, Linkedin } from "lucide-react";
import { Separator } from "~/components/ui/separator";

const NITO_LOGO =
  "data:image/svg+xml,%3csvg%20width='2100'%20height='484'%20viewBox='0%200%202100%20484'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20fill-rule='evenodd'%20clip-rule='evenodd'%20d='M471%20473H11V13H471V473ZM89%20395H300L89%2090V395ZM183%2090L394%20395V90H183Z'%20fill='%232EC78F'/%3e%3cpath%20d='M626%20473H704V154L947%20473H1015V12H937V332L694%2012H626V473Z'%20fill='%232EC78F'/%3e%3cpath%20d='M1115%20472V12L1193%2012.1054V472H1115Z'%20fill='%232EC78F'/%3e%3cpath%20d='M1393%2086V473H1471V86H1617V12H1251V86H1393Z'%20fill='%232EC78F'/%3e%3cpath%20fill-rule='evenodd'%20clip-rule='evenodd'%20d='M1855%205C1985.89%205%202092%20111.109%202092%20242C2092%20372.891%201985.89%20479%201855%20479C1724.11%20479%201618%20372.891%201618%20242C1618%20111.109%201724.11%205%201855%205ZM1855.5%2087C1769.62%2087%201700%20156.62%201700%20242.5C1700%20328.38%201769.62%20398%201855.5%20398C1941.38%20398%202011%20328.38%202011%20242.5C2011%20156.62%201941.38%2087%201855.5%2087Z'%20fill='%232EC78F'/%3e%3c/svg%3e";

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.1.11 18.14.127 18.18a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const NotionIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
  </svg>
);

const SOCIAL_LINKS = [
  {
    href: "https://www.facebook.com/tihlde",
    label: "Facebook",
    Icon: Facebook,
  },
  {
    href: "https://www.instagram.com/tihlde",
    label: "Instagram",
    Icon: Instagram,
  },
  {
    href: "https://www.linkedin.com/company/tihlde",
    label: "LinkedIn",
    Icon: Linkedin,
  },
  {
    href: "https://www.notion.so/tihlde/invite/442710f897b596ecd4f8e078cb25fcf76045125a",
    label: "Notion",
    Icon: NotionIcon,
  },
  {
    href: "https://discord.gg/HNt5XQdyxy",
    label: "Discord",
    Icon: DiscordIcon,
  },
];

export default function Footer() {
  return (
    <footer className="w-full">
      <Separator variant="subtle" />
      <div className="container mx-auto grid gap-6 px-4 py-6 md:grid-cols-3 md:gap-8 md:py-10">
        <div className="flex flex-col items-center gap-1 text-center md:items-start md:gap-2 md:text-left">
          <h3 className="font-heading text-sm font-semibold">Kontakt</h3>
          <p>
            E-post: <a href="mailto:hs@tihlde.org">hs@tihlde.org</a>
          </p>
          <p>Lokasjon: c/o IDI, NTNU</p>
          <p>Org.nr: 989 684 183</p>
          <a
            href="https://tihlde.org/kontakt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-link hover:underline"
          >
            Kontakt oss
          </a>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <h3 className="font-heading text-sm font-semibold">
            Hovedsamarbeidspartner
          </h3>
          <a
            href="https://www.dnv.no/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="DNV"
            className="rounded-lg bg-white p-3 md:p-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ekstern SVG, som i Photon */}
            <img
              src="https://cdn.onedesign.dnv.com/onedesigncdn/3.7.0/images/DNV_logo_RGB.svg"
              alt="DNV"
              loading="lazy"
              className="w-36 md:w-48"
            />
          </a>
        </div>

        <div className="flex flex-col items-center gap-3 text-center md:items-end md:text-right">
          <h3 className="font-heading text-sm font-semibold">Samarbeid</h3>
          <a
            href="https://www.nito.no/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="NITO"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG, som i Photon */}
            <img
              src={NITO_LOGO}
              alt="NITO"
              loading="lazy"
              className="w-24 md:w-28"
            />
          </a>
        </div>

        <div className="flex items-center justify-center gap-6 md:col-span-3 md:gap-3">
          {SOCIAL_LINKS.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
            >
              <Icon className="size-5" />
            </a>
          ))}
        </div>
      </div>
      <Separator variant="subtle" />
      <div className="container mx-auto flex flex-col items-center justify-between gap-1 px-4 py-4 text-center text-sm md:flex-row md:gap-2 md:py-6 md:text-left">
        <p>© {new Date().getFullYear()} TIHLDE</p>
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
        >
          Personvernerklæring
        </a>
      </div>
    </footer>
  );
}
