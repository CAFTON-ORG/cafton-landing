import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/env.public";

function redirectTo(request: NextRequest, pathname: string, next?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (next) url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

/**
 * Refreshes the Supabase session cookie and performs the optimistic redirect
 * for /dashboard. A session alone does not make someone staff, so /login is
 * never redirected here (the page checks for a staff profile). Real
 * authorization happens in the Data Access Layer (lib/auth/dal.ts), never only
 * here.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDashboard = pathname.startsWith("/dashboard");

  if (!isSupabaseConfigured) {
    if (isDashboard && process.env.NODE_ENV === "production") {
      return redirectTo(request, "/login");
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  if (isDashboard && !data?.claims) return redirectTo(request, "/login", pathname);

  return response;
}
