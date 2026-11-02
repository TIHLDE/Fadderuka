import type { Gender } from "@prisma/client";

/**
 * The choices offered for `User.gender`, in the order the forms show them.
 *
 * One list for the registration form, the login prompt, the profile menu and
 * the admin filters, so the Norwegian labels are written exactly once.
 */
export const GENDERS = [
  { value: "MANN", label: "Mann" },
  { value: "KVINNE", label: "Kvinne" },
  { value: "ANNET", label: "Annet" },
] as const satisfies readonly { value: Gender; label: string }[];

export const GENDER_VALUES = [
  "MANN",
  "KVINNE",
  "ANNET",
] as const satisfies readonly Gender[];

/** Label for a stored gender; `null` is a user who has not answered yet. */
export function genderLabel(gender: string | null | undefined): string {
  return GENDERS.find((g) => g.value === gender)?.label ?? "Ikke oppgitt";
}

/**
 * The admin filters' choices: every gender, plus "nobody has answered" and
 * "show everyone". The extra two are not real values, so they cannot collide.
 */
export const GENDER_FILTERS = [
  { value: "ALLE", label: "Alle kjønn" },
  ...GENDERS,
  { value: "IKKE_OPPGITT", label: "Ikke oppgitt" },
] as const;

export type GenderFilter = (typeof GENDER_FILTERS)[number]["value"];

export function matchesGenderFilter(
  gender: string | null | undefined,
  filter: GenderFilter,
): boolean {
  if (filter === "ALLE") return true;
  if (filter === "IKKE_OPPGITT") return gender == null;
  return gender === filter;
}

/**
 * One line summing up a group's genders for the group admin, e.g.
 * "4 mann · 3 kvinne · 2 ikke oppgitt". Zero counts are left out.
 */
export function genderBreakdown(
  genders: readonly (string | null | undefined)[],
): string {
  const parts = [
    ...GENDERS.map(
      (g) =>
        [
          genders.filter((x) => x === g.value).length,
          g.label.toLowerCase(),
        ] as const,
    ),
    [genders.filter((x) => x == null).length, "ikke oppgitt"] as const,
  ];
  return (
    parts
      .filter(([count]) => count > 0)
      .map(([count, label]) => `${count} ${label}`)
      .join(" · ") || "Ingen medlemmer"
  );
}
