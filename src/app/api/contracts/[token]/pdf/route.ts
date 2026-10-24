import { NextResponse } from "next/server";

import { renderContractPdf } from "@/features/contracts/pdf/contract-pdf";
import { getPublicContract } from "@/features/contracts/repository/contracts";
import { companyDetails } from "@/features/sales/services/emails";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The client's PDF: `/api/contracts/<secret token>/pdf`. Anyone with the link can read it, nobody else can. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const limit = checkRateLimit(`contract-pdf:${getClientKey(request)}`, {
    limit: 30,
    windowMs: 10 * 60_000,
  });
  if (!limit.allowed) return new NextResponse("Too many requests.", { status: 429 });
  const { token } = await params;
  const contract = await getPublicContract(token);
  if (!contract) return new NextResponse("Not found", { status: 404 });
  const file = await renderContractPdf(contract, await companyDetails());
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${contract.reference}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
