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

// Pin the fadderuke cohort so "who pays" never depends on the day the suite
// runs. Without it the year is derived from the calendar, and every
// cohort-based assertion would start failing on its own in January.
process.env.FADDERUKE_COHORT_YEAR = "2026";

// A throwaway key so the tests exercise the same encrypt-at-rest path
// production uses. Without it, TIHLDE tokens are simply not stored, and the
// session tests would be checking a code path no deployment runs.
process.env.SESSION_ENCRYPTION_KEY = "0".repeat(64);

// Photon's email API, which "glemt passord" sends through. The host is fake and
// `fetch` is stubbed — the key only has to be set for the feature to be on.
process.env.PHOTON_API_URL = "https://photon.test";
process.env.PHOTON_EMAIL_API_KEY = "test-email-api-key";
process.env.PHOTON_REGISTER_API_KEY = "test-register-api-key";
process.env.PHOTON_OAUTH_CLIENT_ID = "test-oauth-client-id";
process.env.PHOTON_OAUTH_CLIENT_SECRET = "test-oauth-client-secret";
process.env.APP_URL = "https://fadderuka.test";

export const TEST_DATABASE_URL = databaseUrl;
