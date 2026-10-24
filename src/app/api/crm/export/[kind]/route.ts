import { NextResponse } from "next/server";

import {
  EXPORT_KINDS,
  canExport,
  exportCsv,
  type ExportKind,
} from "@/features/crm/services/export";
import { getStaff } from "@/lib/auth/dal";
import { isDatabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** `/api/crm/export/leads?status=new` downloads the list as it is on screen. Staff only. */
export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const staff = await getStaff();
  if (!staff) return new NextResponse("Sign in first.", { status: 401 });
  if (!(EXPORT_KINDS as readonly string[]).includes(kind)) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!canExport(staff, kind as ExportKind)) {
    return new NextResponse("You don't have permission to export this.", { status: 403 });
  }
  if (!isDatabaseConfigured) return new NextResponse("No database.", { status: 503 });

  const { filename, body } = await exportCsv(
    kind as ExportKind,
    new URL(request.url).searchParams,
    staff,
  );
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
