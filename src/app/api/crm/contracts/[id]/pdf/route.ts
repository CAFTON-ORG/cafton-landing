import { NextResponse } from "next/server";

import { renderContractPdf } from "@/features/contracts/pdf/contract-pdf";
import { getPublicContractById } from "@/features/contracts/repository/contracts";
import { companyDetails } from "@/features/sales/services/emails";
import { can, getStaff } from "@/lib/auth/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A contract's PDF for staff, even before it is sent: `/api/crm/contracts/<id>/pdf`. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff) return new NextResponse("Sign in first.", { status: 401 });
  if (!can(staff, "contracts:view")) return new NextResponse("Not allowed.", { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const contract = await getPublicContractById(id);
  if (!contract) return new NextResponse("Not found", { status: 404 });
  const file = await renderContractPdf(contract, await companyDetails());
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${contract.reference}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
