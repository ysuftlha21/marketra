import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/database.types";
import { sanitizeAuthCallbackRedirect } from "@/lib/security/redirect";
import { loadAuthContext } from "@/lib/auth/session";
import { z } from "zod";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit-service";
import { RateLimitExceededError } from "@/lib/providers/rate-limit/rate-limit.provider";
import { getPrivacySafeClientIpScope } from "@/lib/security/client-ip";

const emailOtpTypeSchema = z.enum([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.redirect(new URL("/sign-in?error=config", request.nextUrl.origin));
  }

  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const otpType = emailOtpTypeSchema.safeParse(request.nextUrl.searchParams.get("type"));
  const next = sanitizeAuthCallbackRedirect(request.nextUrl.searchParams.get("next"), "/dashboard");
  const errorRedirect = new URL("/sign-in?error=callback", request.nextUrl.origin);

  try {
    await enforceRateLimit({
      operation: "auth_callback",
      userId: `anonymous:${getPrivacySafeClientIpScope(request.headers)}`,
    });
  } catch (error) {
    const response = NextResponse.redirect(
      new URL("/sign-in?error=rate_limited", request.nextUrl.origin),
    );
    if (error instanceof RateLimitExceededError) {
      for (const [name, value] of Object.entries(rateLimitHeaders(error.result)))
        response.headers.set(name, value);
    }
    return response;
  }

  if (!code && (!tokenHash || !otpType.success)) {
    return NextResponse.redirect(errorRedirect);
  }

  let applySessionCookies = (_response: NextResponse) => {};

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(updates) {
        const applyPreviousCookies = applySessionCookies;
        applySessionCookies = (response) => {
          applyPreviousCookies(response);
          updates.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        };
      },
    },
  });

  const authResult = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && otpType.success
      ? await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType.data,
        })
      : null;
  if (!authResult) return NextResponse.redirect(errorRedirect);
  const { data, error } = authResult;
  if (error || !data.session) {
    return NextResponse.redirect(errorRedirect);
  }

  let destination = next;
  if (next !== "/reset-password") {
    try {
      const authContext = await loadAuthContext(supabase);
      destination = authContext?.activeWorkspace ? "/dashboard" : "/onboarding";
    } catch {
      return NextResponse.redirect(new URL("/sign-in?error=readiness", request.nextUrl.origin));
    }
  }

  const response = NextResponse.redirect(new URL(destination, request.nextUrl.origin));
  applySessionCookies(response);
  return response;
}
