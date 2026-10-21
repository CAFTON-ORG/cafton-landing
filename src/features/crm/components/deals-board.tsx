"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { useCan } from "@/components/dashboard/layout/staff-context";
import { Badge } from "@/components/dashboard/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import { cn } from "@/lib/utils";
import { moveDeal } from "../actions/deals";
import { checkMoveDeal } from "../rules";
import type { DealView, StageView } from "../types";

/**
 * The pipeline as columns, one per stage. Moving a card uses a select rather
 * than drag and drop, so it works with a keyboard, a screen reader and a phone.
 */
export function DealsBoard({ stages, deals }: { stages: StageView[]; deals: DealView[] }) {
  const canMove = useCan("deals:update");
  const { run, pending } = useServerAction();
  const openStages = stages.filter((stage) => stage.kind === "open");

  return (
    <div
      className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6"
      role="region"
      aria-label="Sales pipeline"
      tabIndex={0}
    >
      <div className="flex min-w-max gap-3">
        {stages.map((stage) => {
          const inStage = deals.filter((deal) => deal.stageId === stage.id);
          const total = inStage.reduce((sum, deal) => sum + (deal.amountMinor ?? 0), 0);
          return (
            <section
              key={stage.id}
              aria-labelledby={`stage-${stage.key}`}
              className={cn(
                "bg-muted/40 flex w-72 shrink-0 flex-col rounded-xl border",
                stage.kind === "won" && "border-emerald-500/30",
                stage.kind === "lost" && "opacity-80",
              )}
            >
              <header className="flex items-start justify-between gap-2 border-b p-3">
                <div>
                  <h2 id={`stage-${stage.key}`} className="text-sm font-semibold">
                    {stage.name}
                  </h2>
                  <p className="text-foreground/70 text-xs">
                    {inStage.length} {inStage.length === 1 ? "deal" : "deals"} ·{" "}
                    {formatMinor(total, "PHP", { compact: true })}
                  </p>
                </div>
                {stage.kind === "open" && <Badge variant="outline">{stage.probability}%</Badge>}
              </header>

              <ul className="grid gap-2 p-2">
                {inStage.length === 0 && (
                  <li className="text-foreground/70 px-1 py-4 text-center text-xs">
                    Nothing here
                  </li>
                )}
                {inStage.map((deal) => (
                  <li key={deal.id} className="bg-card rounded-lg border p-3 shadow-xs">
                    <Link
                      href={`/dashboard/crm/deals/${deal.id}`}
                      className="text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {deal.title}
                    </Link>
                    <p className="text-foreground/70 mt-0.5 truncate text-xs">
                      {deal.organizationName ?? deal.contactName}
                    </p>
                    <p className="mt-2 text-sm font-semibold tabular-nums">
                      {formatMinor(deal.amountMinor, deal.currency, { compact: true })}
                    </p>
                    <div className="text-foreground/70 mt-1 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">{deal.ownerName ?? "Unassigned"}</span>
                      {deal.expectedCloseDate && (
                        <span className="inline-flex shrink-0 items-center gap-1">
                          <CalendarDays className="size-3" aria-hidden="true" />{" "}
                          {formatDate(deal.expectedCloseDate, { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                    {canMove && deal.stageKind === "open" && (
                      <Select
                        value={deal.stageId}
                        disabled={pending}
                        onValueChange={(stageId) =>
                          run(() => moveDeal(deal.id, String(stageId)), { success: "Deal moved." })
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          aria-label={`Move ${deal.title} to another stage`}
                          className="mt-2 w-full"
                        >
                          <SelectValue>
                            {(value: string) =>
                              stages.find((s) => s.id === value)?.name ?? deal.stageName
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {openStages.map((target) => (
                            <SelectItem
                              key={target.id}
                              value={target.id}
                              disabled={
                                !!checkMoveDeal(
                                  { stageKind: deal.stageKind, amountMinor: deal.amountMinor },
                                  target,
                                )
                              }
                            >
                              {target.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {stages.length === 0 && (
        <EmptyState
          title="No pipeline stages"
          description="The pipeline stages haven't been set up in the database yet."
        />
      )}
    </div>
  );
}
