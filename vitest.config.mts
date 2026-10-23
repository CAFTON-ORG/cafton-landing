import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root("./src"),
      "server-only": root("./test/server-only.ts"),
    },
  },
  test: {
    // Node by default (fast; right for lib/server code). Component tests switch
    // to jsdom with a `// @vitest-environment jsdom` docblock.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
    // The integration tests build a real Postgres (PGlite) and run in parallel with every other file:
    // on a busy machine a first query can take longer than the 5 s default.
    testTimeout: 30_000,
    hookTimeout: 120_000,
    restoreMocks: true,
    unstubGlobals: true,
  },
});
