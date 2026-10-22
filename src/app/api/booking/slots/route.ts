import { NextResponse } from "next/server";

import { availableMonth } from "@/features/schedule/website";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";

/** The calendar fetches a month at a time and again when the visitor turns the page. */
const RATE_LIMIT =
  process.env.NODE_ENV === "production"
    ? { limit: 60, windowMs: 60 * 1000 }
    : { limit: 600, windowMs: 60 * 1000 };

/**
 * Free times for one month of the contact form's calendar: GET /api/booking/slots?month=2026-11.
 * It only ever says when Cafton is free, never who it is meeting.
 */
export async function GET(request: Request) {
  const limit = checkRateLimit(`slots:${getClientKey(request)}`, RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json({ message: "Use ?month=YYYY-MM." }, { status: 400 });
  }

  try {
    return NextResponse.json(await availableMonth(month), {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
    });
  } catch (error) {
    console.error("Unable to read the booking calendar.", error);
    return NextResponse.json({ enabled: false, days: {} }, { status: 200 });
  }
}
