import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { StageView } from "../types";

/** Where a deal is on its way through the pipeline: done stages ticked, the current one marked. */
export function StageStepper({
  stages,
  currentId,
  closedKind,
}: {
  stages: StageView[];
  currentId: string;
  closedKind: "open" | "won" | "lost";
}) {
  const path = stages.filter((stage) => stage.kind === "open" || stage.id === currentId);
  const index = path.findIndex((stage) => stage.id === currentId);
  return (
    <ol aria-label="Pipeline stage" className="flex flex-wrap gap-1.5">
      {path.map((stage, position) => {
        const done = position < index || (closedKind === "won" && position === index);
        const current = position === index;
        return (
          <li
            key={stage.id}
            aria-current={current ? "step" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              done &&
                "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
              current &&
                closedKind === "open" &&
                "border-primary bg-primary text-primary-foreground",
              current &&
                closedKind === "lost" &&
                "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-300",
              !done && !current && "text-muted-foreground",
            )}
          >
            {done && <Check className="size-3" aria-hidden="true" />}
            {stage.name}
          </li>
        );
      })}
    </ol>
  );
}
