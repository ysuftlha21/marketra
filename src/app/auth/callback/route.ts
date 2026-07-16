import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/database.types";
import { sanitizeRedirect } from "@/lib/security/redirect";

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.redirect(new URL("/sign-in?error=config", request.nextUrl.origin));
  }

  const code = request.nextUrl.searchParams.get("code");
  const nextRaw = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const next = sanitizeRedirect(nextRaw, "/dashboard");
  const errorRedirect = new URL("/sign-in?error=callback", request.nextUrl.origin);

  if (!code) {
    return NextResponse.redirect(errorRedirect);
  }

  const response = NextResponse.redirect(new URL(next, request.nextUrl.origin));

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(errorRedirect);
  }

  return response;
}
