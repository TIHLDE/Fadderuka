import { execFileSync } from "node:child_process";

import { PrismaClient } from "@prisma/client";

import { TEST_DATABASE_URL } from "./env";

/**
 * Create the test database if it doesn't exist yet.
 *
 * Connects to the server's built-in `postgres` database (which always exists)
 * and issues `CREATE DATABASE`. This is what lets a fresh checkout run
 * `bun run test` without a manual `createdb` step.
 */
async function ensureDatabaseExists(): Promise<void> {
  const url = new URL(TEST_DATABASE_URL);
  const name = url.pathname.replace(/^\//, "");

  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";

  const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
  try {
    const existing = await admin.$queryRawUnsafe<{ datname: string }[]>(
      "SELECT datname FROM pg_database WHERE datname = $1",
      name,
    );
    if (existing.length === 0) {
      // Identifiers can't be parameterised; the name is derived from our own
      // URL, and quoting it keeps a surprising name from breaking the statement.
      await admin.$executeRawUnsafe(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
      console.log(`[tests] opprettet testdatabasen "${name}"`);
    }
  } finally {
    await admin.$disconnect();
  }
}

/**
 * Bring the test database up to date once per `vitest run`, so the suite tests
 * the real migrations (not `db push`) and nobody has to remember a manual step.
 */
export default async function setup() {
  await ensureDatabaseExists();

  execFileSync("bunx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
