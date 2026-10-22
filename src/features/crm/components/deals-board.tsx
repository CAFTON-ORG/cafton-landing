"use client";

import Link from "next/link";
import { StatCard } from "@/components/dashboard/shared/stat-card";
import { Person } from "@/components/dashboard/shared/person";
import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  AlertCircle,
  Banknote,
  Building2,
  CalendarClock,
  CalendarDays,
  GripVertical,
  Handshake,
  Scale,
  Search,
} from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Field } from "@/components/dashboard/shared/field";
import { Badge } from "@/components/dashboard/ui/badge";
import { Button } from "@/components/dashboard/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Input } from "@/components/dashboard/ui/input";
import { ScrollArea } from "@/components/dashboard/ui/scroll-area";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import { cn } from "@/lib/utils";
import { manilaDate } from "@/features/schedule/slots";
import { loseDeal, moveDeal, winDeal } from "../actions/deals";
import { pipelineStats } from "../stats";
import { checkMoveDeal } from "../rules";
import type { DealView, StageView } from "../types";

const DAY = 86_400_000;
const daysIn = (iso: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));
/** Today in the Philippines: close dates are calendar dates there, and UTC is a day behind before 8 am. */
const todayKey = () => manilaDate(new Date());

/**
 * The pipeline as columns, one per stage. Drag a card by its handle to move it (mouse, touch, or
 * keyboard: focus the handle, press Space, use the arrow keys, press Space again). Dropping on
 * "Won" wins the deal; dropping on "Lost" asks why. On a phone there is also a stage menu.
 */
export function DealsBoard({ stages, deals }: { stages: StageView[]; deals: DealView[] }) {
  const canMove = useCan("deals:update");
  const { run, pending } = useServerAction();
  // Where cards sit while a move is saving, so the card doesn't jump back and forth.
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState<DealView | null>(null);
  const [losing, setLosing] = useState<DealView | null>(null);
  const [reason, setReason] = useState("");
  const [query, setQuery] = useState("");
  const openStages = stages.filter((stage) => stage.kind === "open");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const stageOf = (deal: DealView) => placed[deal.id] ?? deal.stageId;
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return deals;
    return deals.filter((deal) =>
      [deal.title, deal.reference, deal.contactName, deal.organizationName, deal.ownerName]
        .filter(Boolean)
        .some((text) => text!.toLowerCase().includes(needle)),
    );
  }, [deals, query]);
  const byStage = useMemo(() => {
    const map = new Map<string, DealView[]>();
    for (const stage of stages) map.set(stage.id, []);
    for (const deal of visible) map.get(placed[deal.id] ?? deal.stageId)?.push(deal);
    return map;
  }, [visible, stages, placed]);

  function settle(deal: DealView) {
    setPlaced((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => id !== deal.id)),
    );
  }

  function move(deal: DealView, target: StageView) {
    if (target.id === stageOf(deal)) return;
    if (target.kind === "lost") {
      setLosing(deal);
      return;
    }
    if (target.kind === "won") {
      run(() => winDeal(deal.id), { success: "Deal won. Congratulations!" });
      return;
    }
    const blocked = checkMoveDeal(
      { stageKind: deal.stageKind, amountMinor: deal.amountMinor },
      target,
    );
    if (blocked) {
      run(async () => ({ ok: false as const, error: blocked }));
      return;
    }
    setPlaced((current) => ({ ...current, [deal.id]: target.id }));
    run(() => moveDeal(deal.id, target.id), {
      success: `Moved to ${target.name}.`,
      onSuccess: () => settle(deal),
    });
    // A failed move shows its error; put the card back after it has had time to render.
    setTimeout(() => settle(deal), 4000);
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(null);
    const deal = deals.find((d) => d.id === event.active.id);
    const target = stages.find((s) => s.id === event.over?.id);
    if (deal && target) move(deal, target);
  }

  function onDragStart(event: DragStartEvent) {
    setDragging(deals.find((d) => d.id === event.active.id) ?? null);
  }

  return (
    <>
      <PipelineSummary stages={stages} byStage={byStage} query={query} onQuery={setQuery} />
      <DndContext
        id="deals-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <ScrollArea
          orientation="horizontal"
          className="-mx-4 h-[calc(100svh-27rem)] min-h-[28rem] sm:-mx-6"
          role="region"
          aria-label="Sales pipeline"
        >
          <div className="flex h-full min-w-max gap-3 px-4 py-1 sm:px-6">
            {stages.map((stage) => (
              <Column
                key={stage.id}
                stage={stage}
                deals={byStage.get(stage.id) ?? []}
                canMove={canMove}
                pending={pending}
                openStages={openStages}
                stages={stages}
                droppable={canMove && (dragging ? dragging.stageKind === "open" : true)}
                onMove={move}
                dragging={dragging}
              />
            ))}
          </div>
          {stages.length === 0 && (
            <EmptyState
              title="No pipeline stages"
              description="The pipeline stages haven't been set up in the database yet."
            />
          )}
        </ScrollArea>
        <DragOverlay dropAnimation={null}>
          {dragging && <Card deal={dragging} overlay />}
        </DragOverlay>
      </DndContext>

      <Dialog open={!!losing} onOpenChange={(open) => !open && !pending && setLosing(null)}>
        <DialogContent>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const deal = losing;
              if (!deal) return;
              run(() => loseDeal(deal.id, reason), {
                success: "Deal marked as lost.",
                onSuccess: () => {
                  setLosing(null);
                  setReason("");
                },
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Mark “{losing?.title}” as lost?</DialogTitle>
              <DialogDescription>
                Say why, so the team can learn from it. You can reopen it later.
              </DialogDescription>
            </DialogHeader>
            <Field id="board-lost-reason" label="Why was it lost?" required>
              <Textarea
                id="board-lost-reason"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLosing(null)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={pending || !reason.trim()}>
                {pending ? "Saving…" : "Mark as lost"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Column({
  stage,
  deals,
  canMove,
  pending,
  openStages,
  stages,
  droppable,
  dragging,
  onMove,
}: {
  stage: StageView;
  deals: DealView[];
  canMove: boolean;
  pending: boolean;
  openStages: StageView[];
  stages: StageView[];
  droppable: boolean;
  dragging: DealView | null;
  onMove: (deal: DealView, stage: StageView) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, disabled: !droppable });
  const total = deals.reduce((sum, deal) => sum + (deal.amountMinor ?? 0), 0);
  const weighted = Math.round((total * stage.probability) / 100);
  const closing = dragging && (stage.kind === "won" || stage.kind === "lost");
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`stage-${stage.key}`}
      className={cn(
        "bg-muted/40 flex h-full w-72 shrink-0 flex-col rounded-xl border transition-colors",
        stage.kind === "won" && "border-emerald-500/30",
        stage.kind === "lost" && "opacity-90",
        isOver && "bg-primary/5 border-primary ring-primary/30 ring-2",
        closing && !isOver && "border-dashed",
      )}
    >
      <header className="flex shrink-0 items-start justify-between gap-2 border-b p-3">
        <div>
          <h2 id={`stage-${stage.key}`} className="text-sm font-semibold">
            {stage.name}
          </h2>
          <p className="text-foreground/70 text-xs">
            {deals.length} {deals.length === 1 ? "deal" : "deals"} ·{" "}
            {formatMinor(total, "PHP", { compact: true })}
          </p>
          {stage.kind === "open" && total > 0 && (
            <p className="text-foreground/70 text-xs">
              Forecast {formatMinor(weighted, "PHP", { compact: true })}
            </p>
          )}
        </div>
        {stage.kind === "open" && <Badge variant="outline">{stage.probability}%</Badge>}
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <ul className="grid content-start gap-2 p-2">
          {deals.length === 0 && (
            <li className="text-foreground/70 px-1 py-4 text-center text-xs">
              {closing ? `Drop to ${stage.kind === "won" ? "win" : "lose"} it` : "Nothing here"}
            </li>
          )}
          {deals.map((deal) => (
            <li key={deal.id}>
              <DraggableCard
                deal={deal}
                stages={stages}
                openStages={openStages}
                draggable={canMove && deal.stageKind === "open"}
                pending={pending}
                onMove={onMove}
                hidden={dragging?.id === deal.id}
              />
            </li>
          ))}
        </ul>
      </ScrollArea>
    </section>
  );
}

function DraggableCard({
  deal,
  stages,
  openStages,
  draggable,
  pending,
  onMove,
  hidden,
}: {
  deal: DealView;
  stages: StageView[];
  openStages: StageView[];
  draggable: boolean;
  pending: boolean;
  onMove: (deal: DealView, stage: StageView) => void;
  hidden: boolean;
}) {
  const { setNodeRef, attributes, listeners } = useDraggable({ id: deal.id, disabled: !draggable });
  return (
    <div ref={setNodeRef} className={cn(hidden && "opacity-40")}>
      <Card
        deal={deal}
        handle={
          draggable ? (
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`Move ${deal.title}`}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -ml-1 cursor-grab touch-none rounded p-0.5 focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing"
            >
              <GripVertical className="size-4" aria-hidden="true" />
            </button>
          ) : null
        }
        mobileMove={
          draggable ? (
            <Select
              value={deal.stageId}
              disabled={pending}
              onValueChange={(stageId) => {
                const target = stages.find((s) => s.id === stageId);
                if (target) onMove(deal, target);
              }}
            >
              <SelectTrigger
                size="sm"
                aria-label={`Move ${deal.title} to another stage`}
                className="mt-2 w-full md:hidden"
              >
                <SelectValue>
                  {(value: string) => stages.find((s) => s.id === value)?.name ?? deal.stageName}
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
          ) : null
        }
      />
    </div>
  );
}

function Card({
  deal,
  handle,
  mobileMove,
  overlay = false,
}: {
  deal: DealView;
  handle?: React.ReactNode;
  mobileMove?: React.ReactNode;
  overlay?: boolean;
}) {
  const open = deal.stageKind === "open";
  const overdue = open && !!deal.expectedCloseDate && deal.expectedCloseDate < todayKey();
  const stale = open && daysIn(deal.stageChangedAt) >= 14;
  return (
    <article
      className={cn(
        "bg-card rounded-lg border p-3 shadow-xs",
        overlay && "ring-primary/40 rotate-1 shadow-lg ring-2",
      )}
    >
      <div className="flex items-start gap-1.5">
        {handle}
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/crm/deals/${deal.id}`}
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            {deal.title}
          </Link>
          <p className="text-foreground/70 mt-0.5 flex items-center gap-1 truncate text-xs">
            {deal.organizationName && <Building2 className="size-3 shrink-0" aria-hidden="true" />}
            <span className="truncate">{deal.organizationName ?? deal.contactName}</span>
          </p>
        </div>
      </div>
      <p className="mt-2 text-sm font-semibold tabular-nums">
        {formatMinor(deal.amountMinor, deal.currency, { compact: true })}
      </p>
      <div className="text-foreground/70 mt-1.5 flex items-center justify-between gap-2 text-xs">
        <Person name={deal.ownerName} avatarUrl={deal.ownerAvatar} />
        {deal.expectedCloseDate && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1",
              overdue && "font-medium text-red-600 dark:text-red-400",
            )}
          >
            {overdue ? (
              <AlertCircle className="size-3" aria-hidden="true" />
            ) : (
              <CalendarDays className="size-3" aria-hidden="true" />
            )}
            {overdue && <span className="sr-only">Overdue: </span>}
            {formatDate(deal.expectedCloseDate, { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
      {stale && (
        <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
          {daysIn(deal.stageChangedAt)} days in this stage
        </p>
      )}
      {open && !deal.nextActivityAt && (
        <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">No next step planned</p>
      )}
      {deal.tags.length > 0 && (
        <p className="mt-1.5 flex flex-wrap gap-1">
          {deal.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </p>
      )}
      {mobileMove}
    </article>
  );
}

/** The standard stat cards above the board, and a search box. */
function PipelineSummary({
  stages,
  byStage,
  query,
  onQuery,
}: {
  stages: StageView[];
  byStage: Map<string, DealView[]>;
  query: string;
  onQuery: (value: string) => void;
}) {
  const open = stages.flatMap((stage) => byStage.get(stage.id) ?? []);
  const stats = pipelineStats(stages, open, todayKey());
  return (
    <div className="mb-4 grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open deals"
          value={String(stats.count)}
          hint={
            stats.withoutNextStep > 0
              ? `${stats.withoutNextStep} with no next step`
              : "Every deal has a next step"
          }
          icon={Handshake}
        />
        <StatCard
          label="Open value"
          value={formatMinor(stats.valueMinor, "PHP", { compact: true })}
          hint="Everything still in play"
          icon={Banknote}
        />
        <StatCard
          label="Weighted forecast"
          value={formatMinor(stats.weightedMinor, "PHP", { compact: true })}
          hint="Each deal times its stage's win chance"
          icon={Scale}
        />
        <StatCard
          label="Past their close date"
          value={String(stats.pastCloseDate)}
          hint={stats.pastCloseDate > 0 ? "Move them on or set a new date" : "Nothing is overdue"}
          icon={CalendarClock}
        />
      </div>
      <div className="relative w-full sm:w-72">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search deals, clients, owners"
          aria-label="Search the board"
          className="pl-8"
        />
      </div>
    </div>
  );
}
