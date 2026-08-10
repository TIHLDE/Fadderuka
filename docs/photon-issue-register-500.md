# Photon-issue: `POST /api/user/register` svarer 500 når brukernavnet er tatt

Klar til å limes inn som issue i TIHLDE/Photon. Skrevet 2026-08-07 av Fadderuka-teamet.

---

**Tittel:** `POST /api/user/register` svarer 500 «Internal server error» når brukernavnet allerede finnes

**Labels:** bug, api, auth

## Sammendrag

`POST /api/user/register` krasjer med 500 i stedet for å svare 409/400 når e-posten er ny, men det utledede brukernavnet allerede er i bruk. Better Auth sin unikhetssjekk på brukernavn kjører aldri for dette endepunktet, så innsettingen går rett på unik-indeksen `user.username`.

Dette rammer alle som allerede har en Photon-konto laget med Feide og deretter registrerer seg via en tjeneste som bruker `users:create`.

## Effekt

Fadderuka viser Photons melding til studenten. En ny masterstudent på Digital transformasjon møtte derfor teksten «Internal server error» på registreringsskjemaet 2026-08-07, uten noe hint om at det de skulle gjort var å logge inn. Vi har lappet over det på vår side ved å aldri gjenta en 5xx fra Photon, men selve feilen bør fikses her — den gjelder alle konsumenter av API-nøkkelen.

## Reproduksjon

1. Lag en konto med Feide på tihlde.org. Kontoen får `username` = NTNU-brukernavn (backfilles i `syncFeideHook` → `backfillUsername`), og `email` = adressen Feide oppgir, som ofte **ikke** er `<ntnu-brukernavn>@stud.ntnu.no`.
2. Kall `POST /api/user/register` med en API-nøkkel som har `users:create`:
   ```json
   {
     "name": "Ola Nordmann",
     "email": "olanord@stud.ntnu.no",
     "password": "<minst 8 tegn>",
     "studyProgramSlug": "digital-samhandling"
   }
   ```
   der `olanord` er brukernavnet fra steg 1, men adressen er en annen enn den kontoen har.
3. Forventet: 409 (eller 400) med en melding som sier at brukeren finnes.
   Faktisk: `500 {"status":500,"message":"Internal server error"}`.

Merk: hvis adressen er **identisk** med den eksisterende, svarer Better Auth pent med «User already exists». Det er bare brukernavn-kollisjonen som krasjer.

## Årsak

`apps/api/src/routes/user/register.ts` kaller `auth.api.signUpEmail`. Brukernavnet settes av den globale før-hooken i `packages/auth/src/index.ts`:

```ts
hooks: {
    before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email") return;
        // ...
        return { context: { body: { ...ctx.body, email, username: match[1] } } };
    }),
```

I `better-auth@1.6.x` (`dist/api/dispatch.mjs`):

- `getHooks()` legger brukerens hook **først**, deretter plugin-hookene — så username-pluginens hooks kjører etter vår.
- `runBeforeHooks()` samler returnert kontekst i `modifiedContext`, men kaller hver hook med den **opprinnelige** konteksten: `hook.handler({ ...context, returnHeaders: true })`. Den sammenslåtte konteksten treffer først selve endepunktet.

Følgen er at username-pluginens sjekk

```ts
const username = ctx.body.username;
if (username !== void 0 && typeof username === "string") {
  /* USERNAME_IS_ALREADY_TAKEN */
}
```

ser `undefined` og hopper over hele valideringen. Database-hooken fanger det heller ikke opp, fordi den hopper over validering nettopp for `/sign-up/email`:

```ts
const pathsWithHttpHookValidation = ["/sign-up/email", "/update-user"];
// ...
if (!skipValidation)
  await validateUsername(username, displayUsername, ctx.adapter);
```

Da står bare unik-indeksen igjen (`packages/db/src/schema/auth.ts`: `username: text("username").unique()`), og drivertfeilen bobler ufanget opp til `globalErrorHandler`, som i produksjon svarer «Internal server error».

Det samme gjelder websidens egen registrering — den går gjennom nøyaktig samme hook.

## Forslag til fiks

Enten, eller helst begge:

1. **I `registerUserRoute`:** slå opp brukernavnet før `signUpEmail`, på linje med slug-sjekken som allerede gjøres der, og svar 409 hvis det er tatt. Da får kalleren noe å vise brukeren.
2. **I den globale før-hooken:** sett `username` slik at pluginens validering faktisk ser det — eller gjør unikhetssjekken selv i hooken. Dette er det som også dekker websidens sign-up.

Et sikkerhetsnett i `globalErrorHandler` for unik-brudd fra databasen (→ 409) ville dessuten hindre at neste tilsvarende sak lekker «Internal server error» ut til en student.

## Berørte filer

- `apps/api/src/routes/user/register.ts`
- `packages/auth/src/index.ts` (`hooks.before` for `/sign-up/email`)
- `packages/db/src/schema/auth.ts` (unik-indeksen)
- `apps/api/src/lib/errors.ts` (`globalErrorHandler`)
