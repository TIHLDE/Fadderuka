import { Badge } from "~/components/ui/badge";
import { genderLabel } from "~/lib/gender";

/** Kjønnet til en bruker i adminpanelet. Et tomt svar vises dempet, ikke skjult. */
export function GenderBadge({ gender }: { gender: string | null }) {
  if (!gender) {
    return <span className="text-muted-foreground">Ikke oppgitt</span>;
  }
  return <Badge variant="outline">{genderLabel(gender)}</Badge>;
}
