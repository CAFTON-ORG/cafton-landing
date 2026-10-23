import { NextResponse } from "next/server";

import { CRM_FILES_BUCKET, filePermission } from "@/features/crm/files";
import { can, getStaff } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { createAdminClient, isAdminStorageConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How long a download link works. It is issued per click, so it can be short. */
const LINK_SECONDS = 60;

/**
 * A record's file for staff: `/api/crm/files/<id>`. The bucket is private, so this checks that the
 * person may see the record the file is on, then sends them to a signed link that expires in a
 * minute. The file is offered as a download, never displayed in the page.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff) return new NextResponse("Sign in first.", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  const file = await prisma.recordFile.findUnique({ where: { id } });
  if (!file) return new NextResponse("Not found", { status: 404 });
  const permission = filePermission(
    {
      leadId: file.leadId ?? undefined,
      contactId: file.contactId ?? undefined,
      organizationId: file.organizationId ?? undefined,
      dealId: file.dealId ?? undefined,
    },
    "view",
  );
  if (!can(staff, permission)) return new NextResponse("Not allowed.", { status: 403 });
  if (!isAdminStorageConfigured)
    return new NextResponse("File storage isn't set up.", { status: 503 });

  const { data, error } = await createAdminClient()
    .storage.from(CRM_FILES_BUCKET)
    .createSignedUrl(file.path, LINK_SECONDS, { download: file.name });
  if (error || !data) return new NextResponse("Couldn't open the file.", { status: 502 });
  const response = NextResponse.redirect(data.signedUrl, 302);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
