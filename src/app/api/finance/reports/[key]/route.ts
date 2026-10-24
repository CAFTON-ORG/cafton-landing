import { NextResponse } from "next/server";

import { readParams, getReport } from "@/features/finance/repository/reports";
import { REPORT_KEYS, reportToCsv, type ReportKey } from "@/features/finance/rules/reports";
import { renderReportPdf } from "@/features/finance/pdf/report-pdf";
import { companyDetails } from "@/features/sales/services/emails";
import { can, getStaff } from "@/lib/auth/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A report as a file for staff: `/api/finance/reports/<key>?from=&to=&asOf=&format=csv|pdf`. It is
 * built from the same description as the screen, so the file always matches what was on screen.
 */
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const staff = await getStaff();
  if (!staff) return new NextResponse("Sign in first.", { status: 401 });
  if (!can(staff, "finance:view")) return new NextResponse("Not allowed.", { status: 403 });
  const { key } = await params;
  if (!(REPORT_KEYS as readonly string[]).includes(key))
    return new NextResponse("Not found", { status: 404 });

  const url = new URL(request.url);
  const dates = readParams({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    asOf: url.searchParams.get("asOf") ?? undefined,
  });
  const spec = await getReport(key as ReportKey, dates);
  if (!spec) return new NextResponse("The database isn't set up.", { status: 503 });

  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "csv";
  const name = `${key}-${(spec.subtitle.match(/\d{4}$/) ?? [""])[0]}`.replace(/-$/, "");
  const headers = { "Cache-Control": "private, no-store" };
  if (format === "pdf") {
    const file = await renderReportPdf(spec, await companyDetails());
    return new NextResponse(new Uint8Array(file), {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}.pdf"`,
      },
    });
  }
  return new NextResponse(reportToCsv(spec), {
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.csv"`,
    },
  });
}
