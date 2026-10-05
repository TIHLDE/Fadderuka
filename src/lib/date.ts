/**
 * Tidssonen alle datoer og klokkeslett vises i.
 *
 * Uten en eksplisitt tidssone formaterer `toLocale*String` i prosessens egen
 * sone. På Vercel er det UTC, så serverrendrede klokkeslett kom ut to timer
 * feil om sommeren (én om vinteren), og klientkomponenter fikk i tillegg en
 * hydreringsfeil når nettleseren — i norsk tid — rendret noe annet. Fadderuka
 * skjer i Trondheim, så alt vises i norsk tid uansett hvor koden kjører.
 */
export const TIME_ZONE = "Europe/Oslo";

/**
 * Kalenderdagen et tidspunkt faller på i norsk tid, som `YYYY-MM-DD`.
 *
 * Brukes til å gruppere aktiviteter per dag. `toDateString()` grupperte etter
 * serverens sone, så en aktivitet kl. 00:30 havnet på dagen før. Formatet
 * kan sendes rett til `new Date()` og formateres videre med `TIME_ZONE`.
 */
export function osloDateKey(date: Date | string): string {
  // `sv-SE` gir ISO-rekkefølgen (2026-08-10) uten å bygge strengen selv.
  return new Date(date).toLocaleDateString("sv-SE", { timeZone: TIME_ZONE });
}
