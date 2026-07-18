export const MAJORS = [
  "Dataingeniør",
  "Digital Forretningsutvikling",
  "Digital Infrastruktur og Cybersikkerhet",
  "Digital transformasjon",
  "Informasjonsbehandling",
] as const;

export type Major = (typeof MAJORS)[number];

export const UKJENT_STUDIERETNING = "Ukjent studieretning";

/** TIHLDE's casing for studieretning names isn't guaranteed, so match case-insensitively. */
export function findMajor(studieretning: string | null | undefined): Major | null {
  if (!studieretning) return null;
  const normalized = studieretning.trim().toLowerCase();
  return MAJORS.find((major) => major.toLowerCase() === normalized) ?? null;
}

/** Sorts studieretning labels in canonical MAJORS order, with unknowns last. */
export function compareMajorLabels(a: string, b: string): number {
  const aIsMajor = (MAJORS as readonly string[]).includes(a);
  const bIsMajor = (MAJORS as readonly string[]).includes(b);
  if (a === UKJENT_STUDIERETNING) return 1;
  if (b === UKJENT_STUDIERETNING) return -1;
  if (aIsMajor && !bIsMajor) return -1;
  if (!aIsMajor && bIsMajor) return 1;
  if (aIsMajor && bIsMajor) {
    return MAJORS.indexOf(a as Major) - MAJORS.indexOf(b as Major);
  }
  return a.localeCompare(b, "no");
}
