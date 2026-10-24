import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { getDocument } from "@/features/cms/repository/documents";
import { BookingSettingsForm } from "@/features/schedule/components/booking-settings-form";
import { can, requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Booking settings" };

export default async function BookingSettingsPage() {
  const staff = await requirePageAccess("meetings:view");
  if (!staff) return <AccessDenied area="the booking settings" />;
  const value = await getDocument("booking");

  return (
    <>
      <BackLink href="/dashboard/crm/schedule">Schedule</BackLink>
      <PageHeader
        title="Booking settings"
        description="When visitors and staff can book a call, and how it is offered. Times are Philippine time."
      />
      {can(staff, "meetings:update") ? (
        <BookingSettingsForm key={JSON.stringify(value)} initial={value} />
      ) : (
        <p className="text-muted-foreground text-sm">
          You can view the schedule but not change these settings.
        </p>
      )}
    </>
  );
}
