import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { PipelinesEditor } from "@/features/crm/components/pipelines-editor";
import { listCustomFields } from "@/features/crm/repository/custom-fields";
import { stageFieldChoices } from "@/features/crm/rules/pipelines";
import { listPipelines } from "@/features/crm/repository/pipeline";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Pipelines" };

export default async function PipelinesPage() {
  const staff = await requirePageAccess("pipelines:manage");
  if (!staff) return <AccessDenied area="pipelines" />;

  return (
    <>
      <PageHeader
        title="Pipelines"
        description="The stages a deal moves through, and each stage's chance of winning and what a deal needs before it can move in. Won and Lost always end a pipeline."
      />
      <PipelinesEditor
        pipelines={await listPipelines()}
        fieldChoices={stageFieldChoices(await listCustomFields("deal"))}
      />
    </>
  );
}
