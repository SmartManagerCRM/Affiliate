import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Next.js's own compiler swaps this out to a no-op for server-side
      // compilations and only lets it throw in client bundles — vitest has
      // no such distinction, so mirror that no-op behavior here. Tests run
      // as plain Node (never bundled for the browser), so this is safe.
      "server-only": path.resolve(__dirname, "./src/test/server-only-shim.ts"),
    },
  },
});
