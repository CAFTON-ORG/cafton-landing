import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { getProjectForEdit } from "@/features/cms/repository/editor";
import { listAuthorOptions } from "@/features/cms/repository/admin";
import { ProjectEditor } from "@/features/cms/components/project-editor";
import { getServices } from "@/features/cms/repository/services";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("content:view");
  if (!staff) return <AccessDenied area="website content" />;

  const { id } = await params;
  const project = await getProjectForEdit(id);
  if (!project) notFound();
  // Independent reads go out together: each one is a round trip to the database.
  const [authors, services] = await Promise.all([
    listAuthorOptions(staff.id, project.authorId),
    getServices(),
  ]);
  const servicePillars = services.map(({ slug, title }) => ({ slug, title }));
  const readOnly = !can(staff, "content:update");

  return (
    <>
      <BackLink href="/dashboard/content/projects">All projects</BackLink>
      <PageHeader
        title={project.title}
        description={`Last edited ${formatDate(project.updatedAt, { dateStyle: "medium", timeStyle: "short" })}${readOnly ? " · You can read this but not edit it." : ""}`}
      />
      {/* Keyed by the last edit, so the form restarts from the saved values after each save. */}
      <fieldset disabled={readOnly} className="contents">
        <ProjectEditor
          key={project.updatedAt}
          project={project}
          authors={authors}
          servicePillars={servicePillars}
        />
      </fieldset>
    </>
  );
}
