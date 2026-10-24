"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { PersonSelect } from "@/features/crm/components/owner-select";
import { useServerAction } from "@/hooks/use-server-action";
import { minorToInput } from "@/lib/money";
import { createProject, updateProject } from "../actions/projects";
import { durationInput } from "../rules/core";
import type { PersonRef, ProjectView } from "../types/core";

const NO_DEAL = "none";

/** Start a project (no `project`), or edit one. A new project can come from a won deal. */
export function ProjectDialog({
  project,
  people,
  deals = [],
  templates = [],
  trigger,
}: {
  project?: ProjectView;
  people: PersonRef[];
  /** Won deals without a project, offered when starting one. */
  deals?: { id: string; title: string }[];
  /** Active templates a new project can start from. */
  templates?: { id: string; name: string }[];
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { run, pending } = useServerAction();
  const initial = {
    name: project?.name ?? "",
    description: project?.description ?? "",
    dealId: "",
    templateId: "",
    managerId: project?.manager?.id ?? "",
    startDate: project?.startDate ?? "",
    dueDate: project?.dueDate ?? "",
    budget: minorToInput(project?.budgetMinor ?? null, project?.currency),
    budgetHours: project?.budgetMinutes ? durationInput(project.budgetMinutes) : "",
  };
  const [values, setValues] = useState(initial);
  const set = (key: keyof typeof initial) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const input = (key: keyof typeof initial) => ({
    id: `project-${key}`,
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key)(event.target.value),
    "aria-invalid": !!errors[key],
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    const payload = {
      ...values,
      dealId: values.dealId || "none",
      templateId: values.templateId || "none",
      managerId: values.managerId || "none",
    };
    run(() => (project ? updateProject(project.id, payload) : createProject(payload)), {
      success: project ? "Project updated." : "Project started.",
      onSuccess: (data) => {
        setOpen(false);
        if (project) {
          router.refresh();
          return;
        }
        setValues(initial);
        const created = data as { id: string } | undefined;
        if (created?.id) router.push(`/dashboard/projects/${created.id}`);
      },
      onFieldErrors: setErrors,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (next) {
          setValues(initial);
          setErrors({});
        }
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent scrollable className="sm:max-w-xl">
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{project ? "Edit project" : "Start a project"}</DialogTitle>
            <DialogDescription>
              {project
                ? "Status changes happen on the project page."
                : "Projects normally start by themselves when a client accepts a quote. Use this for work that didn't."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <Field id="project-name" label="Name" required error={errors.name}>
              <Input
                {...input("name")}
                autoComplete="off"
                placeholder="e.g. Inventory system for Acme"
              />
            </Field>
            {!project && deals.length > 0 && (
              <Field
                id="project-dealId"
                label="From a won deal"
                error={errors.dealId}
                hint="Copies the client from the deal. Leave empty for internal work."
              >
                <Select
                  value={values.dealId || NO_DEAL}
                  onValueChange={(next) => set("dealId")(next === NO_DEAL ? "" : String(next))}
                >
                  <SelectTrigger id="project-dealId" className="w-full">
                    <SelectValue>
                      {(current: string) =>
                        deals.find((deal) => deal.id === current)?.title ?? "Not from a deal"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_DEAL}>Not from a deal</SelectItem>
                    {deals.map((deal) => (
                      <SelectItem key={deal.id} value={deal.id}>
                        {deal.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            {!project && templates.length > 0 && (
              <Field
                id="project-templateId"
                label="Start from a template"
                error={errors.templateId}
                hint="Adds the template's milestones and tasks. Billable milestones take a share of the price."
              >
                <Select
                  value={values.templateId || NO_DEAL}
                  onValueChange={(next) => set("templateId")(next === NO_DEAL ? "" : String(next))}
                >
                  <SelectTrigger id="project-templateId" className="w-full">
                    <SelectValue>
                      {(current: string) =>
                        templates.find((template) => template.id === current)?.name ?? "No template"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_DEAL}>No template</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field
              id="project-managerId"
              label="Manager"
              error={errors.managerId}
              hint="Runs the project and joins its team."
            >
              <PersonSelect
                id="project-managerId"
                value={values.managerId}
                onChange={set("managerId")}
                people={people}
                noneLabel="No manager yet"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="project-startDate" label="Start" error={errors.startDate}>
                <DatePicker
                  id="project-startDate"
                  value={values.startDate}
                  onChange={set("startDate")}
                  clearable
                />
              </Field>
              <Field id="project-dueDate" label="Due" error={errors.dueDate}>
                <DatePicker
                  id="project-dueDate"
                  value={values.dueDate}
                  onChange={set("dueDate")}
                  clearable
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="project-budget"
                label="Price (₱)"
                error={errors.budget}
                hint="What the client pays. Milestones that bill can't add up to more."
              >
                <Input {...input("budget")} inputMode="decimal" placeholder="e.g. 250,000" />
              </Field>
              <Field
                id="project-budgetHours"
                label="Hours the price assumes"
                error={errors.budgetHours}
                hint="Used to watch hours against the budget."
              >
                <Input {...input("budgetHours")} inputMode="decimal" placeholder="e.g. 120" />
              </Field>
            </div>
            <Field id="project-description" label="Description" error={errors.description}>
              <Textarea {...input("description")} rows={3} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : project ? "Save changes" : "Start project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
