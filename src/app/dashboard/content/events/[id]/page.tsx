import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { getEventForEdit } from "@/features/cms/admin/editor-repository";
import { listAuthorOptions } from "@/features/cms/admin/repository";
import { EventEditor } from "@/features/cms/components/event-editor";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("content:view");
  if (!staff) return <AccessDenied area="website content" />;

  const { id } = await params;
  const event = await getEventForEdit(id);
  if (!event) notFound();
  const authors = await listAuthorOptions();
  const readOnly = !can(staff, "content:update");

  return (
    <>
      <BackLink href="/dashboard/content/events">All events</BackLink>
      <PageHeader
        title={event.title}
        description={`Last edited ${formatDate(event.updatedAt, { dateStyle: "medium", timeStyle: "short" })}${readOnly ? " · You can read this but not edit it." : ""}`}
      />
      {/* Keyed by the last edit, so the form restarts from the saved values after each save. */}
      <fieldset disabled={readOnly} className="contents">
        <EventEditor key={event.updatedAt} event={event} authors={authors} />
      </fieldset>
    </>
  );
}
