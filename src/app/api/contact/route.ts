import { NextResponse } from "next/server";
import { z } from "zod";

import { contactSchema } from "@/features/crm/contact";
import { createLeadFromWebsite } from "@/features/crm/intake";
import { MEETING_MODES } from "@/features/schedule/types";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

/**
 * Generous for a human filling in a contact form, useless for a flood.
 *
 * Locally there's no reverse proxy setting a real client-IP header, so
 * `getClientKey` falls back to the literal string "unknown" for every
 * request from the dev machine -- every manual test submission shares one
 * bucket. A multi-step wizard invites more repeated test-submits than a
 * one-page form did, so the production limit self-blocks local QA almost
 * immediately. Raised outside production only; the production limit is
 * unchanged.
 */
const RATE_LIMIT =
  process.env.NODE_ENV === "production"
    ? { limit: 5, windowMs: 10 * 60 * 1000 }
    : { limit: 100, windowMs: 10 * 60 * 1000 };

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
    .refine((value) => !value.startsWith("//") && !value.includes("\\"), "Invalid page path"),
  turnstileToken: z.string().min(1).max(2_048),
  /** A time picked on the form's calendar. It is checked again on the server. */
  meeting: z.object({ start: z.iso.datetime(), mode: z.enum(MEETING_MODES) }).optional(),
});

export async function POST(request: Request) {
  // Before any parsing or outbound calls: a flood shouldn't get to spend our
  // Turnstile quota or reach the database, let alone fill it.
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

  // The Content-Length header above is only a hint (and absent on chunked
  // requests), so the real size is enforced on what was actually read.
  const rawBody = await request.text().catch(() => "");
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ message: "Request too large." }, { status: 413 });
  }

  let body: unknown = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }
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

  // The page path is validated above (same-origin path only), so it is safe to store as given.
  const result = await createLeadFromWebsite(
    parsed.data.contact,
    {
      leadSource: parsed.data.leadSource,
      pageName: parsed.data.pageName,
      pagePath: parsed.data.pagePath,
    },
    parsed.data.meeting && {
      start: new Date(parsed.data.meeting.start),
      mode: parsed.data.meeting.mode,
    },
  );

  return NextResponse.json(result.ok ? { ok: true, meeting: result.meeting } : result, {
    status: result.ok ? 200 : 502,
  });
}
