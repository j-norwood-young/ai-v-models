import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 60_000,
    hookTimeout: 30_000,
    pool: "forks",
    // Run e2e tests sequentially (shared port space)
    maxConcurrency: 1,
    reporters: ["verbose"],
    include: ["src/**/*.test.ts"],
  },
});
