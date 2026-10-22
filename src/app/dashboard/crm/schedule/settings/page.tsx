import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { DocForm } from "@/features/cms/components/doc-form";
import { getDocument } from "@/features/cms/repository/documents";
import { siteDocuments } from "@/features/cms/site/registry";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Booking settings" };

export default async function BookingSettingsPage() {
  const staff = await requirePageAccess("meetings:view");
  if (!staff) return <AccessDenied area="the booking settings" />;

  const { spec } = siteDocuments.booking;
  const value = await getDocument("booking");

  return (
    <>
      <BackLink href="/dashboard/crm/schedule">Schedule</BackLink>
      <PageHeader title={spec.title} description={spec.description} />
      <DocForm
        key={JSON.stringify(value)}
        spec={spec}
        initial={value as unknown as Record<string, unknown>}
        permission="meetings:update"
      />
    </>
  );
}
