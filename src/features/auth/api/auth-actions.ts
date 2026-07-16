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

async function getRedirectNext(): Promise<string> {
  const h = await headers();
  return sanitizeRedirect(h.get("next"), fallbackForPath(h.get("referer")));
}

function fallbackForPath(referer: string | null): string {
  return referer ? referer : "/dashboard";
}

export async function signUpAction(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    displayName: formData.get("displayName") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.displayName ?? null } },
  });
  if (error) {
    return { error: authError(error.code, "Sign up failed. Please try again.") };
  }
  if (data.user && data.session == null) {
    redirect("/sign-in?verified=1");
  }
  redirect("/onboarding");
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
