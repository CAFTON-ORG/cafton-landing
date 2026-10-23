import { NextResponse } from "next/server";

import { renderInvoicePdf } from "@/features/finance/pdf/invoice-pdf";
import { getInvoice } from "@/features/finance/invoice-repository";
import { companyDetails } from "@/features/sales/emails";
import { manilaDate } from "@/features/schedule/slots";
import { can, getStaff } from "@/lib/auth/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** An invoice's PDF for staff: `/api/finance/invoices/<id>/pdf`. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff) return new NextResponse("Sign in first.", { status: 401 });
  if (!can(staff, "invoices:view")) return new NextResponse("Not allowed.", { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const invoice = await getInvoice(id, manilaDate(new Date()));
  if (!invoice) return new NextResponse("Not found", { status: 404 });
  const file = await renderInvoicePdf(invoice, await companyDetails());
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.number ?? "invoice-draft"}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
