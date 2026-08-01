import { defineConfig } from "vitest/config";
import path from "node:path";
import { loadEnvFile } from "node:process";

if (!process.env.OPENAI_API_KEY && !process.env.SMTP_HOST && !process.env.HUNTER_API_KEY) {
  loadEnvFile(".env.local");
}
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: { environment: "node", include: ["tests/smoke/**/*.test.ts"] },
});
