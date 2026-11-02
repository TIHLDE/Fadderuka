# Fadderuke

Nettside for fadderbarn og faddere under fadderuken.

## Tester

Fadderuka bruker bun!
For lokal testing, kjør:
bun install, deretter bun dev

Integrasjonstestene kjører serverkoden (tRPC-routere, route handlers,
Vipps- og TIHLDE-klientene) mot en ekte Postgres. Ingen test treffer Vipps eller
TIHLDE — `fetch` er stubbet.

Har du en lokal database kjørende, er det bare å kjøre:

```bash
bun run test
```

Testene bruker sin egen database, avledet fra `DATABASE_URL` i `.env`: samme
server og samme brukernavn, men med `_test` bak navnet (`fadderuke` →
`fadderuke_test`). Databasen opprettes automatisk første gang, og migrasjonene
kjøres før hver kjøring. Utviklingsdatabasen røres aldri.

Trenger du å peke et annet sted, sett `TEST_DATABASE_URL`. Testene nekter å
kjøre mot en ikke-lokal database, siden de kjører `TRUNCATE` på alle tabellene.

`bun run check` kjører lint, typecheck og tester samlet — det samme som CI gjør
på hver PR mot `main` (se `.github/workflows/ci.yml`), i tillegg til
`next build`.

## Release

Fadderuka har én branch: `main`. Alt arbeid går som feature-branch → PR →
`main`. En merge til `main` deployer **ikke** — en release er en tag.

```bash
bun run cut-release --dry-run   # vis neste tag og hva som slippes
bun run cut-release             # lag og push taggen
```

Skriptet sjekker at du står på `main`, at treet er rent og at `main` er i synk
med `origin/main`, og lager så en tag på formatet `<YYYY-MM-DD>.release-<n>`
(f.eks. `2026-11-02.release-1`). Taggen trigger
`.github/workflows/deploy.yml`: bygg Docker-image → push til GHCR → varsle Drift.
Lag aldri taggen for hånd, og aldri flytt eller gjenbruk en tag.

Skriptet sjekker **ikke** CI. Se at commiten på `main` er grønn før du tagger:

```bash
gh api "repos/TIHLDE/Fadderuka/commits/<sha>/check-runs" \
  --jq '.check_runs[] | "\(.name): \(.conclusion // .status)"'
```

Migrasjoner kjøres automatisk når containeren starter
(`prisma migrate deploy`), før serveren svarer på noe.
