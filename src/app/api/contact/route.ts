import { NextResponse } from "next/server";
import { z } from "zod";

import { contactSchema } from "@/lib/contact";
import { submitContactToHubSpot } from "@/lib/hubspot";
import { verifyTurnstileToken } from "@/lib/turnstile";

const requestSchema = z.object({
  contact: contactSchema,
  leadSource: z.string().trim().min(1).max(100),
  pageName: z.string().trim().min(1).max(100),
  pagePath: z.string().startsWith("/").max(2_000),
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
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Please check the highlighted fields and try again." },
      { status: 400 },
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const remoteIp =
    request.headers.get("cf-connecting-ip") ??
    forwardedFor?.split(",")[0]?.trim();
  const isHuman = await verifyTurnstileToken(
    parsed.data.turnstileToken,
    remoteIp,
  );

  if (!isHuman) {
    return NextResponse.json(
      { message: "Verification failed. Please try again." },
      { status: 400 },
    );
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const result = await submitContactToHubSpot(
    parsed.data.contact,
    parsed.data.leadSource,
    {
      pageName: parsed.data.pageName,
      pageUri: new URL(parsed.data.pagePath, origin).toString(),
      hutk: getCookieValue(request.headers.get("cookie") ?? "", "hubspotutk"),
    },
  );

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
