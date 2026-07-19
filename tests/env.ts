/**
 * Test environment variables.
 *
 * Imported for its side effects as the very first thing in `tests/setup.ts`, so
 * every value is in place before `~/env` (t3-env) validates on first import.
 *
 * `DATABASE_URL` is *overwritten*, never defaulted: Bun loads the repo's `.env`
 * into `process.env`, and that points at the development database. The tests
 * truncate every table, so pointing them at anything but a throwaway database
 * would destroy real data.
 */

/** Used when there is no `.env` to derive from (a bare checkout, like CI). */
const FALLBACK_DATABASE_URL =
  "postgresql://postgres:password@localhost:5432/fadderuke";

/** Suffix that turns the development database into its throwaway twin. */
const TEST_DB_SUFFIX = "_test";

/**
 * Derive the test database from the development one: same server, same
 * credentials, `_test` appended to the database name. That way a local `bun run
 * test` works with no extra configuration whatever port or password the
 * developer's Postgres runs on — and it can never be the development database
 * itself, since the name always differs.
 *
 * `TEST_DATABASE_URL` overrides it (CI sets it explicitly).
 */
function deriveTestDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL;
  if (explicit) return explicit;

  // Bun loads the repo's `.env`, so this is normally the development database.
  const url = new URL(process.env.DATABASE_URL ?? FALLBACK_DATABASE_URL);
  const name = url.pathname.replace(/^\//, "") || "fadderuke";
  url.pathname = `/${name.endsWith(TEST_DB_SUFFIX) ? name : name + TEST_DB_SUFFIX}`;
  return url.toString();
}

const databaseUrl = deriveTestDatabaseUrl();

/**
 * Refuse to run against a non-local database unless explicitly allowed. The
 * suite runs `TRUNCATE` on every table — a stray `TEST_DATABASE_URL` pointing at
 * Neon (prod) would wipe it.
 */
function assertSafeDatabase(url: string) {
  if (process.env.ALLOW_REMOTE_TEST_DB === "1") return;
  const host = new URL(url).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(
      `Testene nekter å kjøre mot en ikke-lokal database (${host}). ` +
        "Sett TEST_DATABASE_URL til en lokal testdatabase, eller " +
        "ALLOW_REMOTE_TEST_DB=1 hvis du virkelig mener det.",
    );
  }
}

assertSafeDatabase(databaseUrl);

process.env.DATABASE_URL = databaseUrl;
// `NODE_ENV` is typed read-only on `ProcessEnv`, so assign through a widened
// view. It must be set here rather than in the vitest config: `~/env` reads it
// during module init, before any config-level env would apply.
(process.env as Record<string, string>).NODE_ENV = "test";

// Fake external services. No test may reach the real TIHLDE or Vipps APIs —
// `fetch` is stubbed, and these hosts exist only so URL building is realistic.
process.env.TIHLDE_API_URL = "https://tihlde.test";
process.env.VIPPS_API_URL = "https://vipps.test";
process.env.VIPPS_CALLBACK_URL = "https://fadderuka.test";
process.env.VIPPS_CLIENT_ID = "test-client-id";
process.env.VIPPS_CLIENT_SECRET = "test-client-secret";
process.env.VIPPS_MERCHANT_SERIAL_NUMBER = "123456";
process.env.VIPPS_SUBSCRIPTION_KEY = "test-subscription-key";

export const TEST_DATABASE_URL = databaseUrl;
