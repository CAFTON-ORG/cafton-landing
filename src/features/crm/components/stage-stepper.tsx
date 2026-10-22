"use client";

import { Check } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { useServerAction } from "@/hooks/use-server-action";
import { cn } from "@/lib/utils";
import { moveDeal } from "../actions/deals";
import { checkMoveDeal } from "../rules";
import type { StageView } from "../types";

/**
 * Where a deal is on its way through the pipeline, as the chevron-style progress bar people know
 * from Pipedrive and HubSpot: done stages ticked, the current one marked. For an open deal you
 * can click any other open stage to move it there. Under it, what has to be true to move on.
 */
export function StageStepper({
  dealId,
  stages,
  currentId,
  closedKind,
  amountMinor,
}: {
  dealId: string;
  stages: StageView[];
  currentId: string;
  closedKind: "open" | "won" | "lost";
  amountMinor: number | null;
}) {
  const canMove = useCan("deals:update") && closedKind === "open";
  const { run, pending } = useServerAction();
  const path = stages.filter((stage) => stage.kind === "open" || stage.id === currentId);
  const index = path.findIndex((stage) => stage.id === currentId);
  const current = path[index];

  return (
    <div className="grid gap-2">
      <ol aria-label="Pipeline stage" className="flex flex-wrap gap-1.5">
        {path.map((stage, position) => {
          const done = position < index || (closedKind === "won" && position === index);
          const isCurrent = position === index;
          const blocked = !isCurrent
            ? checkMoveDeal({ stageKind: closedKind, amountMinor }, stage)
            : null;
          const interactive = canMove && !isCurrent && !blocked;
          const tone = cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            done &&
              "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
            isCurrent &&
              closedKind === "open" &&
              "border-primary bg-primary text-primary-foreground",
            isCurrent &&
              closedKind === "lost" &&
              "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-300",
            !done && !isCurrent && "text-muted-foreground",
            interactive && "hover:bg-accent hover:text-accent-foreground cursor-pointer",
          );
          return (
            <li key={stage.id} aria-current={isCurrent ? "step" : undefined}>
              {interactive ? (
                <button
                  type="button"
                  disabled={pending}
                  className={cn(
                    tone,
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                  )}
                  aria-label={`Move to ${stage.name}`}
                  onClick={() =>
                    run(() => moveDeal(dealId, stage.id), { success: `Moved to ${stage.name}.` })
                  }
                >
                  {done && <Check className="size-3" aria-hidden="true" />}
                  {stage.name}
                </button>
              ) : (
                <span className={tone}>
                  {done && <Check className="size-3" aria-hidden="true" />}
                  {stage.name}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {closedKind === "open" && current?.exitCriteria && (
        <p className="text-muted-foreground text-xs">To move on: {current.exitCriteria}.</p>
      )}
    </div>
  );
}
