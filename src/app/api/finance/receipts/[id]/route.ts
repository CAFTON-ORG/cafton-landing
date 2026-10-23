import { NextResponse } from "next/server";

import { RECEIPTS_BUCKET } from "@/features/finance/expenses";
import { can, getStaff } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { createAdminClient, isAdminStorageConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How long a download link works. It is issued per click, so it can be short. */
const LINK_SECONDS = 60;

/**
 * An expense's receipt for staff: `/api/finance/receipts/<id>`. The bucket is private, so this
 * checks that the person may see the expense (an approver, or whoever submitted it), then sends
 * them to a signed link that expires in a minute. The file is offered as a download.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff) return new NextResponse("Sign in first.", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  const receipt = await prisma.expenseReceipt.findUnique({
    where: { id },
    include: { expense: { select: { submittedBy: true } } },
  });
  if (!receipt) return new NextResponse("Not found", { status: 404 });
  const allowed =
    can(staff, "expenses:view") ||
    (can(staff, "expenses:submit") && receipt.expense.submittedBy === staff.id);
  if (!allowed) return new NextResponse("Not allowed.", { status: 403 });
  if (!isAdminStorageConfigured)
    return new NextResponse("File storage isn't set up.", { status: 503 });

  const { data, error } = await createAdminClient()
    .storage.from(RECEIPTS_BUCKET)
    .createSignedUrl(receipt.path, LINK_SECONDS, { download: receipt.name });
  if (error || !data) return new NextResponse("Couldn't open the file.", { status: 502 });
  const response = NextResponse.redirect(data.signedUrl, 302);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
