"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Star, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { Field } from "@/components/dashboard/shared/field";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Badge } from "@/components/dashboard/ui/badge";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
import { Input } from "@/components/dashboard/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import {
  addStage,
  createPipeline,
  deletePipeline,
  deleteStage,
  moveStage,
  renamePipeline,
  setDefaultPipeline,
  updateStage,
} from "../actions/pipelines";
import type { StageFieldChoice } from "../pipelines";
import type { PipelineView, StageView } from "../types";

type Values = { name: string; probability: string; exitCriteria: string; requiredFields: string[] };

type Editing =
  | { kind: "new-pipeline" }
  | { kind: "rename"; pipeline: PipelineView }
  | { kind: "add-stage"; pipeline: PipelineView }
  | { kind: "edit-stage"; stage: StageView }
  | null;

type Deleting =
  { kind: "pipeline"; pipeline: PipelineView } | { kind: "stage"; stage: StageView } | null;

/**
 * Pipelines and their stages, in one place. Open stages can be added, renamed, re-ordered and
 * removed; Won and Lost are fixed at the end of every pipeline because the forecast depends on them.
 */
export function PipelinesEditor({
  pipelines,
  fieldChoices,
}: {
  pipelines: PipelineView[];
  fieldChoices: StageFieldChoice[];
}) {
  const { run, pending } = useServerAction();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Deleting>(null);

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ kind: "new-pipeline" })}>
          <Plus aria-hidden="true" /> New pipeline
        </Button>
      </div>

      {pipelines.map((pipeline) => {
        const open = pipeline.stages.filter((stage) => stage.kind === "open");
        return (
          <Card key={pipeline.id}>
            <CardHeader className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {pipeline.name}
                  {pipeline.isDefault && <StatusBadge tone="info">Default</StatusBadge>}
                </CardTitle>
                <CardDescription>
                  {pipeline.dealCount} {pipeline.dealCount === 1 ? "deal" : "deals"} · {open.length}{" "}
                  open {open.length === 1 ? "stage" : "stages"}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing({ kind: "rename", pipeline })}
                >
                  <Pencil aria-hidden="true" /> Rename
                </Button>
                {!pipeline.isDefault && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(() => setDefaultPipeline(pipeline.id), {
                          success: `${pipeline.name} is now the default.`,
                        })
                      }
                    >
                      <Star aria-hidden="true" /> Make default
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleting({ kind: "pipeline", pipeline })}
                    >
                      <Trash2 aria-hidden="true" /> Delete
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              <ol className="divide-y rounded-lg border">
                {pipeline.stages.map((stage) => {
                  const openIndex = open.findIndex((s) => s.id === stage.id);
                  return (
                    <li key={stage.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {stage.name}
                          {stage.kind !== "open" && (
                            <Badge variant="outline">
                              {stage.kind === "won" ? "Closes as won" : "Closes as lost"}
                            </Badge>
                          )}
                        </span>
                        {stage.requiredFields.length > 0 && (
                          <span className="text-muted-foreground block text-xs">
                            Needs: {requirementLabels(stage.requiredFields, fieldChoices)}
                          </span>
                        )}
                        {stage.exitCriteria && (
                          <span className="text-muted-foreground block text-xs">
                            Leaves this stage when: {stage.exitCriteria}
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground w-16 text-right text-sm tabular-nums">
                        {stage.probability}%
                      </span>
                      <span className="flex gap-1">
                        {stage.kind === "open" && (
                          <>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Move ${stage.name} up`}
                              disabled={pending || openIndex === 0}
                              onClick={() => run(() => moveStage(stage.id, "up"))}
                            >
                              <ArrowUp aria-hidden="true" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Move ${stage.name} down`}
                              disabled={pending || openIndex === open.length - 1}
                              onClick={() => run(() => moveStage(stage.id, "down"))}
                            >
                              <ArrowDown aria-hidden="true" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Edit ${stage.name}`}
                          onClick={() => setEditing({ kind: "edit-stage", stage })}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        {stage.kind === "open" && (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Delete ${stage.name}`}
                            onClick={() => setDeleting({ kind: "stage", stage })}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing({ kind: "add-stage", pipeline })}
                >
                  <Plus aria-hidden="true" /> Add a stage
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <EditDialog editing={editing} onClose={() => setEditing(null)} fieldChoices={fieldChoices} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={
          deleting?.kind === "pipeline"
            ? `Delete the pipeline ${deleting.pipeline.name}?`
            : `Delete the stage ${deleting?.stage.name ?? ""}?`
        }
        description={
          deleting?.kind === "pipeline"
            ? "Its stages go with it. Only an empty pipeline can be deleted."
            : "Only a stage with no deals in it can be deleted."
        }
        confirmLabel="Delete"
        destructive
        pending={pending}
        onConfirm={() => {
          const target = deleting;
          if (!target) return;
          run(
            () =>
              target.kind === "pipeline"
                ? deletePipeline(target.pipeline.id)
                : deleteStage(target.stage.id),
            { success: "Deleted.", onSuccess: () => setDeleting(null) },
          );
        }}
      />
    </div>
  );
}

function requirementLabels(tokens: string[], choices: StageFieldChoice[]) {
  return tokens
    .map((token) => choices.find((choice) => choice.token === token)?.label)
    .filter(Boolean)
    .join(", ");
}

function EditDialog({
  editing,
  onClose,
  fieldChoices,
}: {
  editing: Editing;
  onClose: () => void;
  fieldChoices: StageFieldChoice[];
}) {
  const { run, pending } = useServerAction();
  const initial =
    editing?.kind === "rename"
      ? { name: editing.pipeline.name, probability: "", exitCriteria: "", requiredFields: [] }
      : editing?.kind === "edit-stage"
        ? {
            name: editing.stage.name,
            probability: String(editing.stage.probability),
            exitCriteria: editing.stage.exitCriteria ?? "",
            requiredFields: editing.stage.requiredFields,
          }
        : { name: "", probability: "25", exitCriteria: "", requiredFields: [] };
  // Remount per target so the fields start from the right values.
  const key = editing
    ? JSON.stringify([
        editing.kind,
        "pipeline" in editing ? editing.pipeline.id : "",
        "stage" in editing ? editing.stage.id : "",
      ])
    : "closed";
  return (
    <Dialog open={!!editing} onOpenChange={(open) => !open && !pending && onClose()}>
      {editing && (
        <EditForm
          key={key}
          editing={editing}
          initial={initial}
          fieldChoices={fieldChoices}
          onClose={onClose}
          run={run}
          pending={pending}
        />
      )}
    </Dialog>
  );
}

function EditForm({
  editing,
  initial,
  fieldChoices,
  onClose,
  run,
  pending,
}: {
  editing: NonNullable<Editing>;
  initial: Values;
  fieldChoices: StageFieldChoice[];
  onClose: () => void;
  run: ReturnType<typeof useServerAction>["run"];
  pending: boolean;
}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isStage = editing.kind === "add-stage" || editing.kind === "edit-stage";
  const fixed = editing.kind === "edit-stage" && editing.stage.kind !== "open";
  const title =
    editing.kind === "new-pipeline"
      ? "New pipeline"
      : editing.kind === "rename"
        ? "Rename the pipeline"
        : editing.kind === "add-stage"
          ? "Add a stage"
          : "Edit the stage";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    const done = { success: "Saved.", onSuccess: onClose, onFieldErrors: setErrors };
    if (editing.kind === "new-pipeline") run(() => createPipeline({ name: values.name }), done);
    else if (editing.kind === "rename")
      run(() => renamePipeline(editing.pipeline.id, values.name), done);
    else if (editing.kind === "add-stage")
      run(
        () =>
          addStage({
            pipelineId: editing.pipeline.id,
            name: values.name,
            probability: values.probability,
            exitCriteria: values.exitCriteria,
            requiredFields: values.requiredFields,
          }),
        done,
      );
    else
      run(
        () =>
          updateStage({
            id: editing.stage.id,
            name: values.name,
            probability: values.probability,
            exitCriteria: values.exitCriteria,
            requiredFields: values.requiredFields,
          }),
        done,
      );
  }

  return (
    <DialogContent>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {editing.kind === "new-pipeline"
              ? "It starts with New, Qualified, Proposal, Won and Lost. Change them afterwards."
              : isStage
                ? "The win chance feeds the weighted forecast."
                : "Pipelines separate kinds of work, for example sales and partnerships."}
          </DialogDescription>
        </DialogHeader>
        <Field id="pipeline-name" label="Name" required error={errors.name}>
          <Input
            id="pipeline-name"
            value={values.name}
            onChange={(event) => setValues({ ...values, name: event.target.value })}
            aria-invalid={!!errors.name}
            autoComplete="off"
          />
        </Field>
        {isStage && !fixed && (
          <>
            <Field
              id="stage-probability"
              label="Chance of winning (%)"
              error={errors.probability}
              hint="0 to 100. A deal in this stage counts this much towards the forecast."
            >
              <Input
                id="stage-probability"
                inputMode="numeric"
                value={values.probability}
                onChange={(event) => setValues({ ...values, probability: event.target.value })}
                aria-invalid={!!errors.probability}
              />
            </Field>
            <Field
              id="stage-criteria"
              label="Leaves this stage when"
              error={errors.exitCriteria}
              hint="What must be true before a deal moves on (optional)."
            >
              <Input
                id="stage-criteria"
                value={values.exitCriteria}
                onChange={(event) => setValues({ ...values, exitCriteria: event.target.value })}
              />
            </Field>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">A deal needs these to move in</legend>
              <p className="text-muted-foreground text-xs">
                Moving a deal here is refused until they are filled in (optional).
              </p>
              {fieldChoices.map((choice) => (
                <label key={choice.token} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={values.requiredFields.includes(choice.token)}
                    onCheckedChange={(checked) =>
                      setValues({
                        ...values,
                        requiredFields: checked
                          ? [...values.requiredFields, choice.token]
                          : values.requiredFields.filter((token) => token !== choice.token),
                      })
                    }
                  />
                  {choice.label}
                </label>
              ))}
            </fieldset>
          </>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || !values.name.trim()}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
