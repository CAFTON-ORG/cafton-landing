"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutTemplate, Pencil, Plus, Trash2, X } from "lucide-react";

import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Field } from "@/components/dashboard/shared/field";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import { Input } from "@/components/dashboard/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { deleteTemplate, saveTemplate } from "../actions/extras";
import {
  MAX_TEMPLATE_MILESTONES,
  MAX_TEMPLATE_TASKS,
  durationInput,
  parseDuration,
} from "../rules";
import type { TemplateView } from "../types";

interface Draft {
  id?: string;
  name: string;
  description: string;
  active: boolean;
  milestones: { name: string; percent: string }[];
  tasks: { title: string; milestone: string; estimate: string }[];
}

const blank: Draft = {
  name: "",
  description: "",
  active: true,
  milestones: [],
  tasks: [],
};
const NO_MILESTONE = "none";

const toDraft = (template: TemplateView): Draft => ({
  id: template.id,
  name: template.name,
  description: template.description ?? "",
  active: template.active,
  milestones: template.milestones.map((milestone) => ({
    name: milestone.name,
    percent: String(milestone.billablePercent),
  })),
  tasks: template.tasks.map((task) => ({
    title: task.title,
    milestone: task.milestone,
    estimate: task.estimateMinutes ? durationInput(task.estimateMinutes) : "",
  })),
});

/** Reusable plans: the milestones (and what share of the price each invoices) and tasks to start a project from. */
export function TemplatesView({ templates }: { templates: TemplateView[] }) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<TemplateView | null>(null);

  const share = draft
    ? draft.milestones.reduce((sum, milestone) => sum + (Number(milestone.percent) || 0), 0)
    : 0;

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setError("");
    const tasks = draft.tasks.map((task) => ({
      title: task.title,
      milestone: task.milestone,
      estimateMinutes: task.estimate.trim() ? (parseDuration(task.estimate) ?? 0) : undefined,
    }));
    run(
      () =>
        saveTemplate({
          id: draft.id,
          name: draft.name,
          description: draft.description,
          active: draft.active,
          milestones: draft.milestones.map((milestone) => ({
            name: milestone.name,
            billablePercent: milestone.percent.trim() === "" ? 0 : Number(milestone.percent),
          })),
          tasks,
        }),
      {
        success: draft.id ? "Template updated." : "Template added.",
        onSuccess: () => {
          setDraft(null);
          router.refresh();
        },
        onFieldErrors: (errors) => setError(errors.form ?? errors.name ?? ""),
      },
    );
  }

  const setMilestone = (index: number, patch: Partial<Draft["milestones"][number]>) =>
    setDraft(
      (current) =>
        current && {
          ...current,
          milestones: current.milestones.map((item, at) =>
            at === index ? { ...item, ...patch } : item,
          ),
        },
    );
  const setTask = (index: number, patch: Partial<Draft["tasks"][number]>) =>
    setDraft(
      (current) =>
        current && {
          ...current,
          tasks: current.tasks.map((item, at) => (at === index ? { ...item, ...patch } : item)),
        },
    );

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Project templates</CardTitle>
            <CardDescription>
              Start a project with its milestones and tasks already laid out. Billable milestones
              take a share of the project&apos;s price.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setError("");
              setDraft(blank);
            }}
          >
            <Plus aria-hidden="true" /> New template
          </Button>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <EmptyState
              compact
              icon={LayoutTemplate}
              title="No templates yet"
              description="Add one for the kind of project you do most, like a website build."
            />
          ) : (
            <ul className="divide-y rounded-lg border">
              {templates.map((template) => (
                <li key={template.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {template.name}
                      {!template.active && <StatusBadge tone="neutral">Switched off</StatusBadge>}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {template.milestones.length} milestones · {template.tasks.length} tasks
                      {template.description && ` · ${template.description}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Edit ${template.name}`}
                      onClick={() => {
                        setError("");
                        setDraft(toDraft(template));
                      }}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Delete ${template.name}`}
                      disabled={pending}
                      onClick={() => setRemoving(template)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={draft !== null} onOpenChange={(next) => !next && !pending && setDraft(null)}>
        <DialogContent scrollable className="sm:max-w-2xl">
          {draft && (
            <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
              <DialogHeader>
                <DialogTitle>{draft.id ? "Edit template" : "New template"}</DialogTitle>
                <DialogDescription>
                  Milestones come first; tasks can sit under one. Nothing here changes projects that
                  already exist.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="grid gap-5">
                <Field id="template-name" label="Name" required error={error}>
                  <Input
                    id="template-name"
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    aria-invalid={!!error}
                    autoComplete="off"
                    placeholder="e.g. Website build"
                  />
                </Field>
                <Field id="template-description" label="Description">
                  <Textarea
                    id="template-description"
                    rows={2}
                    value={draft.description}
                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  />
                </Field>
                <label className="flex items-center gap-2.5 text-sm">
                  <Checkbox
                    checked={draft.active}
                    onCheckedChange={(checked) => setDraft({ ...draft, active: checked === true })}
                  />
                  Available when starting a project
                </label>

                <fieldset className="grid gap-2">
                  <legend className="text-sm font-medium">
                    Milestones
                    <span
                      className={`ml-2 text-xs font-normal ${share > 100 ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {share}% of the price invoiced
                    </span>
                  </legend>
                  {draft.milestones.map((milestone, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        aria-label={`Milestone ${index + 1} name`}
                        value={milestone.name}
                        onChange={(event) => setMilestone(index, { name: event.target.value })}
                        placeholder="Name"
                        className="min-w-0 flex-1"
                      />
                      <Input
                        aria-label={`Milestone ${index + 1}: share of the price to invoice, percent`}
                        inputMode="numeric"
                        value={milestone.percent}
                        onChange={(event) => setMilestone(index, { percent: event.target.value })}
                        placeholder="0"
                        className="w-20"
                      />
                      <span className="text-muted-foreground text-sm">%</span>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Remove milestone ${index + 1}`}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            milestones: draft.milestones.filter((_, at) => at !== index),
                            tasks: draft.tasks.map((task) =>
                              task.milestone === milestone.name ? { ...task, milestone: "" } : task,
                            ),
                          })
                        }
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                  <div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={draft.milestones.length >= MAX_TEMPLATE_MILESTONES}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          milestones: [...draft.milestones, { name: "", percent: "" }],
                        })
                      }
                    >
                      <Plus aria-hidden="true" /> Add milestone
                    </Button>
                  </div>
                </fieldset>

                <fieldset className="grid gap-2">
                  <legend className="text-sm font-medium">Tasks</legend>
                  {draft.tasks.map((task, index) => (
                    <div key={index} className="grid gap-2 sm:flex sm:items-center">
                      <Input
                        aria-label={`Task ${index + 1} title`}
                        value={task.title}
                        onChange={(event) => setTask(index, { title: event.target.value })}
                        placeholder="Title"
                        className="min-w-0 flex-1"
                      />
                      <div className="flex items-center gap-2">
                        <Select
                          value={task.milestone || NO_MILESTONE}
                          onValueChange={(next) =>
                            setTask(index, { milestone: next === NO_MILESTONE ? "" : String(next) })
                          }
                        >
                          <SelectTrigger
                            aria-label={`Task ${index + 1} milestone`}
                            className="w-40"
                          >
                            <SelectValue>
                              {(value: string) => (value === NO_MILESTONE ? "No milestone" : value)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_MILESTONE}>No milestone</SelectItem>
                            {draft.milestones
                              .filter((milestone) => milestone.name.trim())
                              .map((milestone) => (
                                <SelectItem key={milestone.name} value={milestone.name.trim()}>
                                  {milestone.name.trim()}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Input
                          aria-label={`Task ${index + 1} estimate in hours`}
                          inputMode="decimal"
                          value={task.estimate}
                          onChange={(event) => setTask(index, { estimate: event.target.value })}
                          placeholder="Hours"
                          className="w-20"
                        />
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Remove task ${index + 1}`}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              tasks: draft.tasks.filter((_, at) => at !== index),
                            })
                          }
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={draft.tasks.length >= MAX_TEMPLATE_TASKS}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          tasks: [...draft.tasks, { title: "", milestone: "", estimate: "" }],
                        })
                      }
                    >
                      <Plus aria-hidden="true" /> Add task
                    </Button>
                  </div>
                </fieldset>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setDraft(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending || !draft.name.trim()}>
                  {pending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => !next && setRemoving(null)}
        title={`Delete ${removing?.name ?? "this template"}?`}
        description="Projects already started from it keep their milestones and tasks."
        confirmLabel="Delete"
        destructive
        pending={pending}
        onConfirm={() =>
          removing &&
          run(() => deleteTemplate(removing.id), {
            success: "Template deleted.",
            onSuccess: () => {
              setRemoving(null);
              router.refresh();
            },
          })
        }
      />
    </>
  );
}
