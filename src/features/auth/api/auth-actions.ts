"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServerClient } from "@/lib/db/supabase-server";
import {
  signInSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/features/auth/schema/auth-schemas";
import { sanitizeRedirect } from "@/lib/security/redirect";
import { getPublicAppUrl } from "@/lib/env/runtime-env";
import { z } from "zod";
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { enforceRateLimit, safeRateLimitMessage } from "@/lib/security/rate-limit-service";
import { parseServerEnv } from "@/lib/env/env";
import { logOperation } from "@/lib/observability/logger";
import {
  canCreateAccount,
  CLOSED_BETA_MESSAGE,
  normalizeSignupAllowlist,
} from "@/features/auth/domain/signup-access";

const pricingIntentSchema = z.object({
  plan: z.enum(["starter", "growth"]).optional(),
  billingInterval: z.enum(["monthly", "annual"]).optional(),
  trial: z.literal("true").optional(),
});

function authError(code: string | undefined | null, fallback: string): string {
  switch (code) {
    case "invalid_credentials":
      return "Email or password is incorrect.";
    case "user_already_exists":
    case "user_not_found":
      return "Could not complete the request. Please try again.";
    case "email_not_confirmed":
      return "Please confirm your email before signing in.";
    case "rate_limit_exceeded":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return fallback;
  }
}

const SIGN_UP_EMAIL_RATE_LIMIT_MESSAGE =
  "Too many confirmation emails have been requested. Please wait a while and try again.";
const RESEND_ACCEPTED_MESSAGE =
  "If this address can receive a confirmation email, a new message has been sent.";
const RESEND_FAILURE_MESSAGE = "We could not request another confirmation email. Please try again.";

function signUpError(error: { code?: string | null; status?: number } | null | undefined): string {
  if (
    error?.status === 429 ||
    error?.code === "over_email_send_rate_limit" ||
    error?.code === "email_rate_limit_exceeded"
  ) {
    return SIGN_UP_EMAIL_RATE_LIMIT_MESSAGE;
  }

  return authError(error?.code, "Sign up failed. Please try again.");
}

async function getRedirectNext(): Promise<string> {
  const h = await headers();
  return sanitizeRedirect(h.get("next"), fallbackForPath(h.get("referer")));
}

function fallbackForPath(referer: string | null): string {
  return referer ? referer : "/dashboard";
}

export async function signUpAction(formData: FormData) {
  const pricingIntent = pricingIntentSchema.safeParse({
    plan: formData.get("plan") || undefined,
    billingInterval: formData.get("billingInterval") || undefined,
    trial: formData.get("trial") || undefined,
  });
  if (!pricingIntent.success) return { error: "The selected pricing option is invalid." };

  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    displayName: formData.get("displayName") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const env = parseServerEnv();
  if (
    !canCreateAccount({
      mode: env.SIGNUP_MODE,
      email: parsed.data.email,
      allowlist: normalizeSignupAllowlist(env.SIGNUP_ALLOWLIST),
    })
  ) {
    return { error: CLOSED_BETA_MESSAGE };
  }
  const signupKey = createHash("sha256").update(parsed.data.email.toLowerCase()).digest("hex");
  try {
    await enforceRateLimit({ operation: "signup", userId: `anonymous:${signupKey}`, limit: 5 });
  } catch {
    return { error: "Too many signup attempts. Please wait and try again." };
  }
  let result: Awaited<ReturnType<Awaited<ReturnType<typeof createServerClient>>["auth"]["signUp"]>>;
  try {
    const supabase = await createServerClient();
    result = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          display_name: parsed.data.displayName?.trim() || null,
          pricing_intent: pricingIntent.data.plan
            ? {
                plan: pricingIntent.data.plan,
                billing_interval: pricingIntent.data.billingInterval ?? "monthly",
                trial_requested: pricingIntent.data.trial === "true",
              }
            : null,
        },
        emailRedirectTo: `${getPublicAppUrl()}/auth/callback?next=/dashboard`,
      },
    });
  } catch {
    return { error: "Sign up failed. Please try again." };
  }
  if (result.error) {
    return { error: signUpError(result.error) };
  }
  if (result.data.session) return redirect("/onboarding");
  return redirect(`/sign-up/check-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function resendSignupConfirmationAction(formData: FormData) {
  const operationId = randomUUID();
  const startedAt = Date.now();
  const env = parseServerEnv();
  const environment = env.APP_ENV ?? env.NODE_ENV;
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    logOperation({
      operationId,
      operationType: "auth.signup_confirmation_resend",
      providerId: "supabase_auth",
      durationMs: Date.now() - startedAt,
      success: false,
      controlledErrorCode: "invalid_input",
      environment,
    });
    return { error: RESEND_FAILURE_MESSAGE };
  }

  const resendKey = createHash("sha256").update(parsed.data.email).digest("hex");
  try {
    await enforceRateLimit({
      operation: "signup_confirmation_resend",
      userId: `anonymous:${resendKey}`,
      limit: 3,
    });
  } catch (error) {
    logOperation({
      operationId,
      operationType: "auth.signup_confirmation_resend",
      providerId: "rate_limit",
      durationMs: Date.now() - startedAt,
      success: false,
      controlledErrorCode: "rate_limited",
      environment,
    });
    return {
      error:
        safeRateLimitMessage(error) ??
        "Confirmation email requests are temporarily unavailable. Please try again shortly.",
    };
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: parsed.data.email,
      options: {
        emailRedirectTo: `${getPublicAppUrl()}/auth/callback?next=/dashboard`,
      },
    });

    if (error?.status === 429 || signUpError(error) === SIGN_UP_EMAIL_RATE_LIMIT_MESSAGE) {
      logOperation({
        operationId,
        operationType: "auth.signup_confirmation_resend",
        providerId: "supabase_auth",
        durationMs: Date.now() - startedAt,
        success: false,
        controlledErrorCode: "email_rate_limited",
        environment,
      });
      return { error: SIGN_UP_EMAIL_RATE_LIMIT_MESSAGE };
    }

    logOperation({
      operationId,
      operationType: "auth.signup_confirmation_resend",
      providerId: "supabase_auth",
      durationMs: Date.now() - startedAt,
      success: !error,
      controlledErrorCode: error ? "provider_response_suppressed" : undefined,
      environment,
    });
    // Provider responses are intentionally indistinguishable to prevent account enumeration.
    return { ok: true, message: RESEND_ACCEPTED_MESSAGE };
  } catch {
    logOperation({
      operationId,
      operationType: "auth.signup_confirmation_resend",
      providerId: "supabase_auth",
      durationMs: Date.now() - startedAt,
      success: false,
      controlledErrorCode: "provider_unavailable",
      environment,
    });
    return { error: RESEND_FAILURE_MESSAGE };
  }
}

export async function signInAction(formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { error: authError(error.code, "Sign in failed. Please try again.") };
  }
  redirect(await getRedirectNext());
}

export async function signOutAction() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/sign-in");
}

export async function forgotPasswordAction(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getPublicAppUrl()}/auth/callback?next=/reset-password`,
  });
  if (error) {
    // Generic response: do not reveal whether the email exists.
    return { ok: true };
  }
  return { ok: true };
}

export async function resetPasswordAction(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: authError(error.code, "Could not reset password. Please try again.") };
  }
  redirect("/sign-in?reset=1");
}
