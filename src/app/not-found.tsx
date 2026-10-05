import { SearchX } from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { TihldeLogo } from "~/components/ui/icons/tihlde";

/**
 * 404 for hele appen. Ligger i roten, utenfor begge route-gruppene, så den får
 * ingen header eller footer — samme oppsett som auth-sidene: logo over en smal
 * kolonne. Uten denne viste Next sin egen svarte engelske side.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Link
        href="/"
        className="flex items-center"
        style={{ color: "var(--color-logo, currentColor)" }}
      >
        <TihldeLogo variant="full" className="h-10 w-auto" />
      </Link>
      <Empty className="max-w-md flex-none">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>Fant ikke siden</EmptyTitle>
          <EmptyDescription>
            Siden finnes ikke, eller den har flyttet.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href="/" />}>Til forsiden</Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
