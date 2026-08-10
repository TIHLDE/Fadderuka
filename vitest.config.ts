import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolves the `~/*` alias from tsconfig.json natively (Vite 7+).
    tsconfigPaths: true,
    alias: {
      // Server modules import `server-only`, which throws outside a Next
      // build. Swap it for an empty module so the same code runs under Vitest.
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    include: ["tests/**/*.test.ts"],
    // One shared test database: files must not run concurrently, or their
    // `resetDb()` calls would truncate each other's rows mid-test.
    fileParallelism: false,
    // Prisma migrations + a cold Prisma Client can exceed the 5s default.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
