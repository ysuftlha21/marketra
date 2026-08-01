import { z } from "zod";

const aiProviderSchema = z.enum(["mock", "openai"]);
const leadProviderSchema = z.enum(["mock", "manual", "csv", "external"]);
const companyDiscoveryProviderSchema = z.enum(["mock", "external", "hunter"]);
const buyerDiscoveryProviderSchema = z.enum(["mock", "hunter"]);
const emailEnrichmentProviderSchema = z.enum(["mock", "hunter"]);
const outreachProviderSchema = z.enum(["mock", "openai"]);
const marketProviderSchema = z.enum(["mock", "external"]);
const billingProviderSchema = z.enum(["mock", "stripe", "paytr", "iyzico"]);
const emailProviderSchema = z.enum(["mock", "smtp"]);
const analyticsProviderSchema = z.enum(["mock", "external"]);
const rateLimitProviderSchema = z.enum(["mock", "memory", "redis"]);
const signupModeSchema = z.enum(["open", "invite_only", "allowlist", "disabled"]);

const appEnvSchema = z.enum(["development", "test", "staging", "production"]);

const emptyStringToUndefined = z
  .union([z.literal(""), z.string()])
  .optional()
  .transform((v) => (v === "" ? undefined : v));
const optionalUrlSchema = emptyStringToUndefined.pipe(z.string().url().optional());

// ---------------------------------------------------------------------------
// Public env  — safe for the browser, prefixed NEXT_PUBLIC_
// ---------------------------------------------------------------------------
const publicEnvSchema = z.object({
  APP_ENV: appEnvSchema.optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Marketra"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Server env  — never exposed to the browser
// ---------------------------------------------------------------------------
const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ENV: appEnvSchema.optional(),
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_APP_NAME: z.string().default("Marketra"),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

    // Closed beta
    SIGNUP_MODE: signupModeSchema.default("open"),
    SIGNUP_ALLOWLIST: z.string().default(""),

    // AI provider
    DEFAULT_AI_PROVIDER: aiProviderSchema.default("mock"),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.enum(["gpt-4o-mini"]).default("gpt-4o-mini"),
    OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
    OPENAI_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
    OPENAI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().max(16_384).default(2000),
    OPENAI_PROMPT_VERSION: z.string().default("v1"),
    OPENAI_PROMPT_VERSION_V2: z.string().default("product-analysis-v2"),
    PRODUCT_ANALYSIS_VERSION: z.string().default("v2"),

    // Lead provider
    DEFAULT_LEAD_PROVIDER: leadProviderSchema.default("mock"),
    EXTERNAL_LEAD_API_KEY: z.string().optional(),
    EXTERNAL_LEAD_BASE_URL: optionalUrlSchema,

    // Company discovery provider
    DEFAULT_COMPANY_DISCOVERY_PROVIDER: companyDiscoveryProviderSchema.default("mock"),
    DEFAULT_BUYER_DISCOVERY_PROVIDER: buyerDiscoveryProviderSchema.default("mock"),
    DEFAULT_EMAIL_ENRICHMENT_PROVIDER: emailEnrichmentProviderSchema.default("mock"),
    HUNTER_API_KEY: z.string().min(1).optional(),
    HUNTER_BASE_URL: z.string().url().default("https://api.hunter.io/v2"),
    HUNTER_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
    HUNTER_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
    HUNTER_SMOKE: z
      .string()
      .default("false")
      .transform((value) => value === "true"),

    // Outreach provider
    DEFAULT_OUTREACH_PROVIDER: outreachProviderSchema.default("mock"),

    // Market intelligence provider
    DEFAULT_MARKET_INTELLIGENCE_PROVIDER: marketProviderSchema.default("mock"),
    MARKET_INTELLIGENCE_API_KEY: z.string().optional(),
    MARKET_INTELLIGENCE_BASE_URL: optionalUrlSchema,

    // Billing provider
    DEFAULT_BILLING_PROVIDER: billingProviderSchema.default("mock"),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    PAYTR_MERCHANT_ID: z.string().optional(),
    PAYTR_MERCHANT_KEY: z.string().optional(),
    PAYTR_MERCHANT_SALT: z.string().optional(),
    IYZICO_API_KEY: z.string().optional(),
    IYZICO_SECRET_KEY: z.string().optional(),
    IYZICO_BASE_URL: optionalUrlSchema,

    // Email provider
    DEFAULT_EMAIL_PROVIDER: emailProviderSchema.default("mock"),
    EMAIL_FROM: z.string().default("Marketra <no-reply@marketra.example>"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
    SMTP_MAX_RETRIES: z.coerce.number().int().min(0).max(2).default(1),
    SMTP_SMOKE_TO: z.string().email().optional(),

    // Analytics provider
    DEFAULT_ANALYTICS_PROVIDER: analyticsProviderSchema.default("mock"),
    ANALYTICS_API_KEY: z.string().optional(),

    // Rate limiting
    RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(60),
    DEFAULT_RATE_LIMIT_PROVIDER: rateLimitProviderSchema.default("mock"),
    RATE_LIMIT_REDIS_URL: optionalUrlSchema,
    RATE_LIMIT_REDIS_TOKEN: z.string().optional(),
    RATE_LIMIT_REDIS_KV_REST_API_URL: optionalUrlSchema,
    RATE_LIMIT_REDIS_KV_REST_API_TOKEN: z.string().optional(),
    RATE_LIMIT_NAMESPACE: z
      .string()
      .regex(/^[a-z0-9:_-]+$/i)
      .default("marketra"),
    RATE_LIMIT_FAIL_CLOSED: z
      .string()
      .default("true")
      .transform((value) => value === "true"),
    RATE_LIMIT_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().max(10_000).default(3000),
    RATE_LIMIT_REDIS_SMOKE: z
      .string()
      .default("false")
      .transform((value) => value === "true"),

    // Cost tracking
    AI_COST_TRACKING_ENABLED: z
      .string()
      .default("true")
      .transform((v) => v === "true")
      .pipe(z.boolean()),
    HUNTER_DISCOVERY_UI_ENABLED: z
      .string()
      .default("false")
      .transform((value) => value === "true"),

    // Launch/legal metadata (public text, never credentials)
    LEGAL_EFFECTIVE_DATE: z.string().default("2026-07-23"),
    SUPPORT_EMAIL: z.string().email().default("support@marketra.example"),
    BUILD_VERSION: z.string().default("development"),
  })
  .superRefine((data, ctx) => {
    if (
      (data.DEFAULT_COMPANY_DISCOVERY_PROVIDER === "hunter" ||
        data.DEFAULT_BUYER_DISCOVERY_PROVIDER === "hunter" ||
        data.DEFAULT_EMAIL_ENRICHMENT_PROVIDER === "hunter" ||
        data.HUNTER_SMOKE) &&
      !data.HUNTER_API_KEY
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["HUNTER_API_KEY"],
        message: "HUNTER_API_KEY is required when a Hunter provider or smoke test is enabled.",
      });
    }
    if (data.DEFAULT_AI_PROVIDER === "openai" && !data.OPENAI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OPENAI_API_KEY"],
        message: 'OPENAI_API_KEY is required when DEFAULT_AI_PROVIDER is "openai".',
      });
    }
    if (data.DEFAULT_BILLING_PROVIDER === "stripe" && !data.STRIPE_SECRET_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["STRIPE_SECRET_KEY"],
        message: 'STRIPE_SECRET_KEY is required when DEFAULT_BILLING_PROVIDER is "stripe".',
      });
    }
    if (data.DEFAULT_BILLING_PROVIDER === "paytr" && !data.PAYTR_MERCHANT_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["PAYTR_MERCHANT_ID"],
        message: 'PayTR credentials are required when DEFAULT_BILLING_PROVIDER is "paytr".',
      });
    }
    if (data.DEFAULT_BILLING_PROVIDER === "iyzico" && !data.IYZICO_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["IYZICO_API_KEY"],
        message: 'iyzico credentials are required when DEFAULT_BILLING_PROVIDER is "iyzico".',
      });
    }
    if (
      data.DEFAULT_EMAIL_PROVIDER === "smtp" &&
      (!data.SMTP_HOST || !data.SMTP_USER || !data.SMTP_PASSWORD)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_HOST"],
        message: 'SMTP credentials are required when DEFAULT_EMAIL_PROVIDER is "smtp".',
      });
    }
    if (data.DEFAULT_RATE_LIMIT_PROVIDER === "redis" || data.RATE_LIMIT_REDIS_SMOKE) {
      if (!(data.RATE_LIMIT_REDIS_URL ?? data.RATE_LIMIT_REDIS_KV_REST_API_URL)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["RATE_LIMIT_REDIS_URL"],
          message: "A supported Redis REST URL is required.",
        });
      }
      if (!(data.RATE_LIMIT_REDIS_TOKEN ?? data.RATE_LIMIT_REDIS_KV_REST_API_TOKEN)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["RATE_LIMIT_REDIS_TOKEN"],
          message: "A write-capable Redis REST token is required.",
        });
      }
    }
    if (data.APP_ENV === "production" && data.DEFAULT_RATE_LIMIT_PROVIDER === "memory") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DEFAULT_RATE_LIMIT_PROVIDER"],
        message: "Memory rate limiting is not supported in production.",
      });
    }
  })
  .transform(
    ({ RATE_LIMIT_REDIS_KV_REST_API_URL, RATE_LIMIT_REDIS_KV_REST_API_TOKEN, ...data }) => ({
      ...data,
      RATE_LIMIT_REDIS_URL: data.RATE_LIMIT_REDIS_URL ?? RATE_LIMIT_REDIS_KV_REST_API_URL,
      RATE_LIMIT_REDIS_TOKEN: data.RATE_LIMIT_REDIS_TOKEN ?? RATE_LIMIT_REDIS_KV_REST_API_TOKEN,
    }),
  );

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class EnvironmentValidationError extends Error {
  readonly issues: unknown;
  constructor(message: string, issues: unknown) {
    super(message);
    this.name = "EnvironmentValidationError";
    this.issues = issues;
  }
}

type EnvSource = Record<string, string | undefined>;

export function parsePublicEnv(source: EnvSource = process.env): PublicEnv {
  const parsed = publicEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new EnvironmentValidationError(
      "Invalid public environment configuration",
      parsed.error.flatten(),
    );
  }
  return parsed.data;
}

export function parseServerEnv(source: EnvSource = process.env): ServerEnv {
  const parsed = serverEnvSchema.safeParse(source);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const safe = { fieldErrors: flat.fieldErrors, formErrors: flat.formErrors };
    throw new EnvironmentValidationError("Invalid server environment configuration", safe);
  }
  return parsed.data;
}
