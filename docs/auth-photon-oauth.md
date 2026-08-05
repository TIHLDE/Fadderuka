# Fra passord-proxy til «Logg inn med TIHLDE»

Utredning av å bytte Fadderukas innlogging fra dagens Lepton-proxy til OAuth2/OIDC
mot Photon. Ingen kode er skrevet — dette er grunnlaget for å bestemme om og når.

## Dagens løsning

`POST /api/auth/login` tar imot brukernavn og passord i klartekst, sender dem
videre til Lepton (`POST /auth/login/`), og lagrer API-tokenet vi får tilbake i
`Session.tihldeToken`.

Det fungerer, og det er ryddig skrevet. Men det har tre egenskaper som ikke lar
seg fikse innenfor modellen:

1. **Vi ser passordene.** Appen håndterer TIHLDE-passord i klartekst på vei
   gjennom. Ingen mengde omhu i koden endrer at et sikkerhetsbrudd i Fadderuka
   eksponerer TIHLDE-kontoer. En kompromittert avhengighet i byggekjeden ville
   holdt.
2. **Vi oppbevarer en levende legitimasjon.** `tihldeToken` gir full tilgang til
   brukerens TIHLDE-konto, utløper ikke hos oss, og invalideres ikke når de
   logger ut. Det er nå kryptert i ro, men problemet er at vi har det i det hele
   tatt.
3. **Vi er en åpen orakelflate mot Lepton.** Rate limiting demper det, men
   endepunktet er per definisjon en maskin som svarer på «er dette passordet
   riktig for denne TIHLDE-brukeren?».

I tillegg har appen måttet bygge sin egen lokale passordbro for studenter som
venter på godkjenning på tihlde.org — `passwordHash`, `/velg-passord`. Det er
reell kompleksitet som finnes kun fordi innloggingen er koblet til Leptons
godkjenningsløp. (Engangspassordene admin kunne utstede er fjernet.)

## Hva Photon allerede kan

Photon er ikke bare en ny backend — den er allerede satt opp som
identitetsleverandør. I `packages/auth/src/index.ts` kjører Better Auth med:

- `oauthProvider()` fra `@better-auth/oauth-provider`, med login- og
  samtykkeside konfigurert
- `jwt()` for signerte access tokens
- Feide-innlogging (OIDC mot Dataporten) via `feidePlugin`
- RBAC med permissions, roller og grupper i sesjonen
- Tabellene `oauth_client`, `oauth_access_token`, `oauth_refresh_token` i
  `packages/db/src/schema/auth.ts`
- OAuth-metadata publisert via `createOAuthServerMetadata` /
  `createOAuthOpenIDConfigMetadata`

Det betyr at Photon kan være innloggingsleverandør for Fadderuka **i dag**.
Fadderuka må registreres som OAuth-klient; ingen ny funksjonalitet trengs på
Photon-siden for selve innloggingen.

## Hva byttet ville fjerne

| Fjernes | Hvorfor |
|---|---|
| Passordhåndtering i Fadderuka | Brukeren skriver passordet hos Photon, aldri hos oss |
| `Session.tihldeToken` + kryptering | Vi får et scoped access token, ikke en kontonøkkel |
| `src/server/auth/token-crypto.ts` | Har ikke lenger noe å beskytte |
| Rate limiting på innlogging | Ikke lenger vår innlogging å beskytte |
| Den lokale passordbroen | `passwordHash`, `/velg-passord` |
| `POST /users/` som registreringsvei | Kontoopprettelse skjer hos Photon/Feide |

Grovt anslag: rundt 600 linjer produksjonskode og fire databasekolonner utgår.

## Hva det koster

**Photon må ha dataene.** Migreringen fra Lepton er gjort (alle brukere ligger i
prod), men Fadderuka snakker i dag med `api.tihlde.org` (Lepton), ikke Photon.
Byttet forutsetter at Photon er den autoritative innloggingen for TIHLDE — det
er en større beslutning enn denne appen.

**Nye studenter er det egentlige problemet.** Fadderukas registreringsløp finnes
fordi ferske studenter *ikke har* TIHLDE-bruker ennå. En OAuth-innlogging løser
ikke det: de må fortsatt kunne opprette konto. Photon har egenregistrering med
`@stud.ntnu.no`-krav og e-postverifisering (`STUD_NTNU_EMAIL_PATTERN` i
`packages/auth/src/index.ts`), som er en bedre løsning enn dagens
pending-godkjenning — men flyten må designes: rekker en student å verifisere
e-post og betale i samme økt på stand?

**Kullet må komme med.** Fadder-fritaket avhenger av `klasse` (opptaksår) fra
Lepton-profilen. Photon har tilsvarende via gruppemedlemskap, men feltet må
eksponeres i sesjonen eller i et scope Fadderuka får lese. Uten det faller
regelen «faddere går i 2. klasse eller mer» ned på manuell markering.

**Klientregistrering mangler UI.** `oauth_client`-tabellen finnes, men det er
ingen adminflate for å opprette klienter — første klient må inn manuelt i
databasen. Lite arbeid, men det er ikke gjort.

## Anbefalt rekkefølge

1. **Ikke bytt før fadderuka.** Dagens løsning er herdet nå (kryptering, rate
   limiting, ekte betalingsmur). Å bytte identitetsleverandør uker før 2000
   studenter skal logge inn er feil risiko å ta.
2. **Avklar først om Photon skal være TIHLDEs innlogging.** Dette spørsmålet er
   større enn Fadderuka, og svaret avgjør alt annet her.
3. **Registrer Fadderuka som OAuth-klient i Photon** og kjør innlogging for
   *eksisterende* medlemmer over OAuth, mens nyregistrering blir stående på
   dagens vei. Da får faddere (som alltid har konto) den trygge flyten først, og
   de er nettopp gruppen der passord-proxyen er mest unødvendig.
4. **Flytt nyregistrering sist**, når e-postverifiseringsløpet er testet på
   stand med ekte nettforhold.

## Åpne spørsmål

- Skal Fadderuka ha egen brukertabell etterpå, eller lese alt fra Photon?
  Faddergrupper, betalinger og varsler er Fadderuka-spesifikke og bør bli
  liggende — men da må `tihldeUserId` byttes mot Photons bruker-id.
- Hvordan håndteres utlogging? Photon-sesjonen varer 30 dager; Fadderukas 7.
- Trenger Fadderuka egne scopes, eller holder standard profil + grupper?
