import { randomUUID } from "node:crypto";
import { logOperation } from "@/lib/observability/logger";

const MAX_RESPONSE_BYTES = 1_000_000;

export type HunterErrorCategory =
  | "authentication"
  | "permission_denied"
  | "plan_restricted"
  | "rate_limit"
  | "not_found"
  | "invalid_request"
  | "timeout"
  | "connectivity"
  | "server_error"
  | "provider_unavailable"
  | "invalid_response";

export class HunterProviderError extends Error {
  constructor(
    readonly category: HunterErrorCategory,
    readonly status?: number,
    readonly operationId: string = randomUUID(),
    readonly providerCode?: string,
    readonly retryAfterSeconds?: number,
    readonly attemptCount: number = 1,
  ) {
    super(`Hunter operation failed (${category}).`);
    this.name = "HunterProviderError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
};

export type HunterClientOptions = {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  totalTimeoutMs?: number;
  fetch?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
  onUsage?: (event: {
    operation: string;
    operationId: string;
    attemptCount: number;
    durationMs: number;
    status: number;
  }) => void | Promise<void>;
};

export class HunterClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly totalTimeoutMs: number;
  private readonly fetcher: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly random: () => number;

  constructor(private readonly options: HunterClientOptions) {
    this.baseUrl = (options.baseUrl ?? "https://api.hunter.io/v2").replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.maxRetries = options.maxRetries ?? 2;
    this.totalTimeoutMs =
      options.totalTimeoutMs ?? Math.min((this.maxRetries + 1) * this.timeoutMs + 10_000, 55_000);
    this.fetcher = options.fetch ?? fetch;
    this.sleep =
      options.sleep ??
      ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.random = options.random ?? Math.random;
  }

  async request<T>(operation: string, path: string, options: RequestOptions = {}): Promise<T> {
    const operationId = randomUUID();
    const startedAt = Date.now();
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const remainingTotalMs = this.totalTimeoutMs - (Date.now() - startedAt);
      if (remainingTotalMs <= 0) {
        throw new HunterProviderError(
          "timeout",
          undefined,
          operationId,
          undefined,
          undefined,
          attempt,
        );
      }
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        Math.max(1, Math.min(this.timeoutMs, remainingTotalMs)),
      );
      try {
        const url = new URL(`${this.baseUrl}${path}`);
        url.searchParams.set("api_key", this.options.apiKey);
        for (const [key, value] of Object.entries(options.query ?? {})) {
          if (value !== undefined) url.searchParams.set(key, String(value));
        }
        const response = await this.fetcher(url, {
          method: options.method ?? "GET",
          headers: options.body ? { "content-type": "application/json" } : undefined,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          const safeProviderCode = await this.safeProviderCode(response);
          const category = this.categoryForStatus(response.status, safeProviderCode);
          const retryable = category === "rate_limit" || response.status >= 500;
          if (retryable && attempt < this.maxRetries) {
            await this.sleep(this.retryDelay(response.headers.get("retry-after"), attempt));
            continue;
          }
          const retryAfterSeconds = this.retryAfterSeconds(response.headers.get("retry-after"));
          throw new HunterProviderError(
            category,
            response.status,
            operationId,
            safeProviderCode,
            retryAfterSeconds,
            attempt + 1,
          );
        }
        const declaredLength = Number(response.headers.get("content-length"));
        if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
          throw new HunterProviderError("invalid_response", response.status, operationId);
        }
        const text = await response.text();
        if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
          throw new HunterProviderError("invalid_response", response.status, operationId);
        }
        let data: T;
        try {
          data = JSON.parse(text) as T;
        } catch {
          throw new HunterProviderError("invalid_response", response.status, operationId);
        }
        logOperation({
          operationId,
          operation,
          operationType: "hunter_provider",
          providerId: "hunter",
          durationMs: Date.now() - startedAt,
          success: true,
          httpStatus: response.status,
          environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
        });
        await this.options.onUsage?.({
          operation,
          operationId,
          attemptCount: attempt + 1,
          durationMs: Date.now() - startedAt,
          status: response.status,
        });
        return data;
      } catch (error) {
        lastError = error;
        const timeoutError =
          error !== null &&
          typeof error === "object" &&
          "name" in error &&
          error.name === "AbortError";
        if (timeoutError && attempt < this.maxRetries) {
          await this.sleep(this.retryDelay(null, attempt));
          continue;
        }
        const safeError =
          error instanceof HunterProviderError
            ? error
            : new HunterProviderError(
                timeoutError
                  ? "timeout"
                  : error instanceof TypeError
                    ? "connectivity"
                    : "provider_unavailable",
                undefined,
                operationId,
              );
        logOperation({
          operationId,
          operation,
          operationType: "hunter_provider",
          providerId: "hunter",
          durationMs: Date.now() - startedAt,
          success: false,
          controlledErrorCode: safeError.category,
          httpStatus: safeError.status,
          providerCalls: attempt + 1,
          environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
        });
        const retryableTransport =
          safeError.category === "timeout" || safeError.category === "connectivity";
        if (retryableTransport && attempt < this.maxRetries) {
          const remainingAfterAttempt = this.totalTimeoutMs - (Date.now() - startedAt);
          if (remainingAfterAttempt > 0) {
            await this.sleep(
              Math.min(this.retryDelay(null, attempt), Math.max(0, remainingAfterAttempt)),
            );
            continue;
          }
        }
        if (safeError.attemptCount !== attempt + 1) {
          throw new HunterProviderError(
            safeError.category,
            safeError.status,
            safeError.operationId,
            safeError.providerCode,
            safeError.retryAfterSeconds,
            attempt + 1,
          );
        }
        throw safeError;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new HunterProviderError("provider_unavailable", undefined, operationId);
  }

  private retryDelay(retryAfter: string | null, attempt: number): number {
    const seconds = retryAfter ? Number(retryAfter) : Number.NaN;
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 30000);
    return Math.min(500 * 2 ** attempt + Math.floor(this.random() * 250), 5000);
  }

  private retryAfterSeconds(value: string | null): number | undefined {
    const seconds = value ? Number(value) : Number.NaN;
    return Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds) : undefined;
  }

  private categoryForStatus(status: number, providerCode?: string): HunterErrorCategory {
    if (status === 401) return "authentication";
    if (status === 403 && providerCode === "no_discover_access") return "plan_restricted";
    if (status === 403 || status === 451) return "permission_denied";
    if (status === 429) return "rate_limit";
    if (status === 404) return "not_found";
    if (status >= 400 && status < 500) return "invalid_request";
    if (status >= 500) return "server_error";
    return "provider_unavailable";
  }

  private async safeProviderCode(response: Response): Promise<string | undefined> {
    try {
      const payload = (await response.clone().json()) as { errors?: Array<{ id?: unknown }> };
      const value = payload.errors?.[0]?.id;
      return typeof value === "string" && /^[a-z0-9_]{1,64}$/i.test(value) ? value : undefined;
    } catch {
      return undefined;
    }
  }
}
