# Fadderuke

Nettside for fadderbarn og faddere under fadderuken.

## Tester

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
på hver PR mot `main` og `dev` (se `.github/workflows/ci.yml`), i tillegg til
`next build`.
