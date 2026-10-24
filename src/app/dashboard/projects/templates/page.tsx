import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { TemplatesView } from "@/features/delivery/components/templates-view";
import { listTemplates } from "@/features/delivery/repository/delivery";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Project templates" };

export default async function ProjectTemplatesPage() {
  const staff = await requirePageAccess("projects:templates");
  if (!staff) return <AccessDenied area="project templates" />;

  return (
    <>
      <BackLink href="/dashboard/projects">All projects</BackLink>
      <PageHeader
        title="Project templates"
        description="Milestones and tasks to start a project from, so the same kind of work is planned the same way."
      />
      <TemplatesView templates={await listTemplates()} />
    </>
  );
}
