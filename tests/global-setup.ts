import { execFileSync } from "node:child_process";

import { TEST_DATABASE_URL } from "./env";

/**
 * Bring the test database up to date once per `vitest run`, so the suite tests
 * the real migrations (not `db push`) and nobody has to remember a manual step.
 */
export default function setup() {
  execFileSync("bunx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
