import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { getPartnerForEdit } from "@/features/cms/admin/editor-repository";

import { PartnerEditor } from "@/features/cms/components/partner-editor";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Edit partner" };

export default async function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("content:view");
  if (!staff) return <AccessDenied area="website content" />;

  const { id } = await params;
  const partner = await getPartnerForEdit(id);
  if (!partner) notFound();

  const readOnly = !can(staff, "content:update");

  return (
    <>
      <BackLink href="/dashboard/content/partners">All partners</BackLink>
      <PageHeader
        title={partner.name}
        description={`Last edited ${formatDate(partner.updatedAt, { dateStyle: "medium", timeStyle: "short" })}${readOnly ? " · You can read this but not edit it." : ""}`}
      />
      {/* Keyed by the last edit, so the form restarts from the saved values after each save. */}
      <fieldset disabled={readOnly} className="contents">
        <PartnerEditor key={partner.updatedAt} partner={partner} />
      </fieldset>
    </>
  );
}
