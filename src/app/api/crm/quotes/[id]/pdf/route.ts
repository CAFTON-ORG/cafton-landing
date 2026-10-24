import { NextResponse } from "next/server";

import { companyDetails } from "@/features/sales/services/emails";
import { renderQuotePdf } from "@/features/sales/pdf/quote-pdf";
import { getPublicQuoteById } from "@/features/sales/repository/sales";
import { can, getStaff } from "@/lib/auth/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A quote's PDF for staff, even before it is sent: `/api/crm/quotes/<id>/pdf`. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff) return new NextResponse("Sign in first.", { status: 401 });
  if (!can(staff, "quotes:view")) return new NextResponse("Not allowed.", { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const quote = await getPublicQuoteById(id);
  if (!quote) return new NextResponse("Not found", { status: 404 });
  const file = await renderQuotePdf(quote, await companyDetails());
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quote.reference}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
