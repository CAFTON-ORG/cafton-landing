"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pause, Pencil, Play, RotateCcw, SquareCheckBig, Trash2, XCircle } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { Button } from "@/components/dashboard/ui/button";
import { useServerAction } from "@/hooks/use-server-action";
import { deleteProject, setProjectStatus } from "../actions/projects";
import { PROJECT_STATUS_LABEL, nextProjectStatuses, type ProjectStatus } from "../rules";
import type { PersonRef, ProjectView } from "../types";
import { ProjectDialog } from "./project-dialog";

/** What each move is called on a button, from where the project is now. */
function moveLabel(from: ProjectStatus, to: ProjectStatus) {
  if (to === "active")
    return from === "planned" ? "Start project" : from === "on_hold" ? "Resume" : "Reopen";
  if (to === "on_hold") return "Put on hold";
  if (to === "completed") return "Mark completed";
  if (to === "cancelled") return "Cancel project";
  return "Reopen";
}

const ICON = {
  active: Play,
  on_hold: Pause,
  completed: SquareCheckBig,
  cancelled: XCircle,
  planned: RotateCcw,
} as const;

/** The buttons at the top of a project: edit, move it along, delete it while it never got going. */
export function ProjectActions({ project, people }: { project: ProjectView; people: PersonRef[] }) {
  const router = useRouter();
  const canUpdate = useCan("projects:update");
  const canDelete = useCan("projects:delete");
  const { run, pending } = useServerAction();
  const [confirm, setConfirm] = useState<"cancelled" | "delete" | null>(null);

  const moves = nextProjectStatuses(project.status);
  // The first forward move is the main button; "cancel" is always the quiet one.
  const forward = moves.filter((status) => status !== "cancelled");
  const canCancel = moves.includes("cancelled");

  function move(status: ProjectStatus) {
    run(() => setProjectStatus(project.id, status), {
      success: `Project is now ${PROJECT_STATUS_LABEL[status].toLowerCase()}.`,
      onSuccess: () => {
        setConfirm(null);
        router.refresh();
      },
    });
  }

  if (!canUpdate && !canDelete) return null;
  const deletable = canDelete && (project.status === "planned" || project.status === "cancelled");

  return (
    <div className="flex flex-wrap gap-2">
      {canUpdate &&
        forward.map((status, index) => {
          const Icon = ICON[status];
          return (
            <Button
              key={status}
              variant={index === 0 ? "default" : "outline"}
              disabled={pending}
              onClick={() => move(status)}
            >
              <Icon aria-hidden="true" /> {moveLabel(project.status, status)}
            </Button>
          );
        })}
      {canUpdate && (
        <ProjectDialog
          project={project}
          people={people}
          trigger={
            <Button variant="outline">
              <Pencil aria-hidden="true" /> Edit
            </Button>
          }
        />
      )}
      {canUpdate && canCancel && (
        <Button variant="ghost" disabled={pending} onClick={() => setConfirm("cancelled")}>
          <XCircle aria-hidden="true" /> Cancel project
        </Button>
      )}
      {deletable && (
        <Button variant="ghost" disabled={pending} onClick={() => setConfirm("delete")}>
          <Trash2 aria-hidden="true" /> Delete
        </Button>
      )}

      <ConfirmDialog
        open={confirm === "cancelled"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Cancel this project?"
        description="Work stops and it leaves the open list. Tasks, milestones and logged hours are kept, and you can reopen it later."
        confirmLabel="Cancel project"
        destructive
        pending={pending}
        onConfirm={() => move("cancelled")}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Delete this project?"
        description="It disappears from the list. Only a project that never started, or was cancelled, with no hours logged, can be deleted."
        confirmLabel="Delete"
        destructive
        pending={pending}
        onConfirm={() =>
          run(() => deleteProject(project.id), {
            success: "Project deleted.",
            onSuccess: () => router.push("/dashboard/projects"),
          })
        }
      />
    </div>
  );
}
