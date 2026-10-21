import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { listAuthorOptions } from "@/features/cms/admin/repository";
import { EventEditor } from "@/features/cms/components/event-editor";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage() {
  const staff = await requirePageAccess("content:create");
  if (!staff) return <AccessDenied area="creating content" />;
  const authors = await listAuthorOptions();

  return (
    <>
      <BackLink href="/dashboard/content/events">All events</BackLink>
      <PageHeader
        title="New event"
        description="It is saved as a draft. Publish it when it is ready."
      />
      <EventEditor authors={authors} />
    </>
  );
}
