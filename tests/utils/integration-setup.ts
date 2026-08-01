import { afterAll } from "vitest";
import { measureIntegrationOperation } from "./integration-timing";

const SUPABASE_REQUEST_TIMEOUT_MS = 15_000;
const originalFetch = globalThis.fetch;

function requestCategory(input: RequestInfo | URL): "supabase_auth" | "supabase_database" {
  const rawUrl = input instanceof Request ? input.url : String(input);
  try {
    return new URL(rawUrl).pathname.startsWith("/auth/") ? "supabase_auth" : "supabase_database";
  } catch {
    return "supabase_database";
  }
}

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_REQUEST_TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal;
  const category = requestCategory(input);
  try {
    return await measureIntegrationOperation(category, "http_request", () =>
      originalFetch(input, { ...init, signal }),
    );
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Integration ${category} request timed out after bounded wait.`, {
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

afterAll(() => {
  globalThis.fetch = originalFetch;
});
