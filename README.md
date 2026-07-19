# Fadderuke

Nettside for fadderbarn og faddere under fadderuken.

## Tester

Integrasjonstestene kjører serverkoden (tRPC-routere, route handlers,
Vipps- og TIHLDE-klientene) mot en ekte Postgres. Ingen test treffer Vipps eller
TIHLDE — `fetch` er stubbet.

Testene trenger en egen database som de migrerer og tømmer for hver kjøring:

```bash
docker compose up -d db
createdb -h localhost -p 5432 -U postgres fadderuke_test   # én gang
bun run test
```

Standard tilkobling er `postgresql://postgres:password@localhost:5432/fadderuke_test`
(samme som `compose.yml`). Kjører du Postgres et annet sted, sett `TEST_DATABASE_URL`:

```bash
TEST_DATABASE_URL="postgresql://postgres:<passord>@localhost:5433/fadderuke_test" bun run test
```

Testene nekter å kjøre mot en ikke-lokal database, siden de kjører `TRUNCATE` på
alle tabellene. Migrasjonene kjøres automatisk før pakka starter.

`bun run check` kjører lint, typecheck og tester samlet — det samme som CI gjør
på hver PR mot `main` og `dev` (se `.github/workflows/ci.yml`), i tillegg til
`next build`.
