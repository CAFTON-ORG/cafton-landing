import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { listAuthorOptions } from "@/features/cms/admin/repository";
import { ProjectEditor } from "@/features/cms/components/project-editor";
import { getServices } from "@/features/cms/repository/services";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage() {
  const staff = await requirePageAccess("content:create");
  if (!staff) return <AccessDenied area="creating content" />;
  // Independent reads go out together: each one is a round trip to the database.
  const [authors, services] = await Promise.all([listAuthorOptions(staff.id), getServices()]);
  const servicePillars = services.map(({ slug, title }) => ({ slug, title }));

  return (
    <>
      <BackLink href="/dashboard/content/projects">All projects</BackLink>
      <PageHeader
        title="New project"
        description="It is saved as a draft. Publish it when it is ready."
      />
      <ProjectEditor authors={authors} servicePillars={servicePillars} />
    </>
  );
}
