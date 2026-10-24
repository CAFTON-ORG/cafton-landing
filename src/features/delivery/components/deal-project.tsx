"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { Button } from "@/components/dashboard/ui/button";
import { useServerAction } from "@/hooks/use-server-action";
import { startProjectFromDeal } from "../actions/projects";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "../rules/core";

/**
 * On a deal's page: the project it became, or, for a won deal with none, the button that starts
 * it. (An accepted quote starts one by itself; this is for deals won some other way.)
 */
export function DealProject({
  dealId,
  won,
  project,
}: {
  dealId: string;
  won: boolean;
  project: { id: string; reference: string; name: string; status: ProjectStatus } | null;
}) {
  const router = useRouter();
  const canView = useCan("projects:view");
  const canCreate = useCan("projects:create");
  const { run, pending } = useServerAction();

  if (project) {
    return canView ? (
      <p className="text-sm">
        <Link className="underline underline-offset-4" href={`/dashboard/projects/${project.id}`}>
          {project.reference}
        </Link>{" "}
        <span className="text-muted-foreground">· {PROJECT_STATUS_LABEL[project.status]}</span>
      </p>
    ) : (
      <p className="text-sm">{project.reference}</p>
    );
  }
  if (!won) return <p className="text-muted-foreground text-sm">Starts once the deal is won.</p>;
  if (!canCreate) return <p className="text-muted-foreground text-sm">No project started yet.</p>;
  return (
    <div className="grid gap-2">
      <p className="text-muted-foreground text-sm">
        No project yet. An accepted quote starts one by itself; this deal was won another way.
      </p>
      <div>
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => startProjectFromDeal(dealId), {
              success: "Project started.",
              onSuccess: (data) => {
                const created = data as { id: string } | undefined;
                router.push(created ? `/dashboard/projects/${created.id}` : "/dashboard/projects");
              },
            })
          }
        >
          <Rocket aria-hidden="true" /> {pending ? "Starting…" : "Start the project"}
        </Button>
      </div>
    </div>
  );
}
