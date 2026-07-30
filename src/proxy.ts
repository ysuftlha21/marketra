import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/database.types";

function isAuthRoute(pathname: string): boolean {
  const authRoutes = new Set(["/sign-in", "/sign-up", "/forgot-password", "/reset-password"]);
  return (
    authRoutes.has(pathname) || pathname.startsWith("/sign-up/") || pathname.startsWith("/auth/")
  );
}

function isDashboard(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;

  if (!url || !anonKey) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isDashboard(pathname)) {
    const url_ = request.nextUrl.clone();
    url_.pathname = "/sign-in";
    url_.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url_);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value));
    return redirect;
  }

  if (user && isAuthRoute(pathname)) {
    const url_ = request.nextUrl.clone();
    url_.pathname = "/dashboard";
    url_.search = "";
    const redirect = NextResponse.redirect(url_);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/sign-in",
    "/sign-up",
    "/sign-up/:path*",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
  ],
};
