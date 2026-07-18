export const MAJORS = [
  "Dataingeniør",
  "Digital Forretningsutvikling",
  "Digital Infrastruktur og Cybersikkerhet",
  "Digital transformasjon",
  "Informasjonsbehandling",
] as const;

export type Major = (typeof MAJORS)[number];

/**
 * Study programmes ("linje") selectable during fadderuka self-registration,
 * each mapped to its TIHLDE STUDY group slug (verified against the live
 * `GET /groups/?type=STUDY` API). The label is stored as `studieretning` and is
 * kept in sync with MAJORS so `findMajor` resolves it.
 */
export const REGISTRATION_STUDIES = [
  { label: "Dataingeniør", slug: "dataingenir" },
  { label: "Digital Forretningsutvikling", slug: "digital-forretningsutvikling" },
  {
    label: "Digital Infrastruktur og Cybersikkerhet",
    slug: "digital-infrastruktur-og-cybersikkerhet",
  },
  { label: "Digital transformasjon", slug: "digital-samhandling" },
] as const;

export type RegistrationStudySlug =
  (typeof REGISTRATION_STUDIES)[number]["slug"];

export const REGISTRATION_STUDY_SLUGS = REGISTRATION_STUDIES.map(
  (s) => s.slug,
) as [RegistrationStudySlug, ...RegistrationStudySlug[]];

/** Resolve a study slug to its display label (for storing `studieretning`). */
export function studyLabelForSlug(slug: string): string | null {
  return REGISTRATION_STUDIES.find((s) => s.slug === slug)?.label ?? null;
}

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
