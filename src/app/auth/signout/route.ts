import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/env.public";
import { createClient } from "@/lib/supabase/server";

/** Sign-out is a POST from our own origin only, so another site cannot log people out. */
export async function POST(request: NextRequest) {
  const { origin } = request.nextUrl;
  if (request.headers.get("origin") !== origin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
