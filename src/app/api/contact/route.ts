import { NextResponse } from "next/server";
import { z } from "zod";

import { contactSchema } from "@/lib/contact";
import { submitContactToHubSpot } from "@/lib/hubspot";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site";
import { verifyTurnstileToken } from "@/lib/turnstile";

/** Generous for a human filling in a contact form, useless for a flood. */
const RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

/** The form's own worst case is a few KB; anything larger isn't a form post. */
const MAX_BODY_BYTES = 32 * 1024;

const requestSchema = z.object({
  contact: contactSchema,
  leadSource: z.string().trim().min(1).max(100),
  pageName: z.string().trim().min(1).max(100),
  pagePath: z
    .string()
    .max(2_000)
    .startsWith("/")
    // "//evil.com" is a protocol-relative URL: it starts with "/" but
    // resolves to another origin entirely. Backslashes get normalised to
    // slashes by some parsers, so they're out too.
    .refine(
      (value) => !value.startsWith("//") && !value.includes("\\"),
      "Invalid page path",
    ),
  turnstileToken: z.string().min(1).max(2_048),
});

function getCookieValue(cookieHeader: string, name: string) {
  const value = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim().split("=", 2))
    .find(([key]) => key === name)?.[1];
  return value ? decodeURIComponent(value) : undefined;
}

export async function POST(request: Request) {
  // Before any parsing or outbound calls: a flood shouldn't get to spend our
  // Turnstile quota or HubSpot rate budget, let alone reach them.
  const limit = checkRateLimit(`contact:${getClientKey(request)}`, RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ message: "Request too large." }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Please check the highlighted fields and try again." },
      { status: 400 },
    );
  }

  const remoteIp = getClientKey(request);
  const isHuman = await verifyTurnstileToken(
    parsed.data.turnstileToken,
    remoteIp === "unknown" ? undefined : remoteIp,
  );

  if (!isHuman) {
    return NextResponse.json(
      { message: "Verification failed. Please try again." },
      { status: 400 },
    );
  }

  // Built against our own configured origin, never the request's `Origin`
  // header -- that header is attacker-controlled, so trusting it let anyone
  // write "https://their-site.example/..." into the CRM record's page URL.
  const result = await submitContactToHubSpot(
    parsed.data.contact,
    parsed.data.leadSource,
    {
      pageName: parsed.data.pageName,
      pageUri: new URL(parsed.data.pagePath, SITE_URL).toString(),
      hutk: getCookieValue(request.headers.get("cookie") ?? "", "hubspotutk"),
    },
  );

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
