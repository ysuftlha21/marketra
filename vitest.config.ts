import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { loadEnvFile } from "node:process";

loadEnvFile(".env.local");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/utils/setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/integration/**/*.test.{ts,tsx}",
    ],
    // Prevent parallel file execution in integration tests to avoid
    // Supabase auth rate limiting when multiple suites create users.
    fileParallelism: false,
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
