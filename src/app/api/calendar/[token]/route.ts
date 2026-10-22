import { NextResponse } from "next/server";

import { buildFeed, calendarForToken } from "@/features/schedule/feed";
import { isDatabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A staff member's personal calendar feed (`/api/calendar/<token>.ics`). The token is the secret. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  const token = raw.replace(/\.ics$/, "");
  if (!isDatabaseConfigured || !/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const calendar = await calendarForToken(token);
  if (!calendar) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(buildFeed(calendar.name, calendar.events), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
