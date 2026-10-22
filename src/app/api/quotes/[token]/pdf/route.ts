import { NextResponse } from "next/server";

import { companyDetails } from "@/features/sales/emails";
import { renderQuotePdf } from "@/features/sales/pdf/quote-pdf";
import { getPublicQuote } from "@/features/sales/repository";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The client's PDF: `/api/quotes/<secret token>/pdf`. Anyone with the link can read it, nobody else can. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const limit = checkRateLimit(`quote-pdf:${getClientKey(request)}`, {
    limit: 30,
    windowMs: 10 * 60_000,
  });
  if (!limit.allowed) return new NextResponse("Too many requests.", { status: 429 });
  const { token } = await params;
  const quote = await getPublicQuote(token);
  if (!quote) return new NextResponse("Not found", { status: 404 });
  const file = await renderQuotePdf(quote, await companyDetails());
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.reference}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
