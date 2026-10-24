"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Field } from "@/components/dashboard/shared/field";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Badge } from "@/components/dashboard/ui/badge";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent } from "@/components/dashboard/ui/card";
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
import { Switch } from "@/components/dashboard/ui/switch";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { deleteTemplate, saveTemplate } from "../actions/templates";
import { MERGE_FIELDS } from "../rules/merge";
import { CONTRACT_KINDS, CONTRACT_KIND_LABEL, type ContractKind } from "../rules/core";
import type { TemplateView } from "../types";

/** The wording library for contracts and statements of work. */
export function TemplatesView({ templates }: { templates: TemplateView[] }) {
  const router = useRouter();
  const canManage = useCan("contracts:templates");
  const { run, pending } = useServerAction();
  const [editing, setEditing] = useState<TemplateView | "new" | null>(null);
  const [deleting, setDeleting] = useState<TemplateView | null>(null);

  const add = (
    <Button onClick={() => setEditing("new")}>
      <Plus aria-hidden="true" /> Add a template
    </Button>
  );

  return (
    <>
      {templates.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={FileText}
              title="No templates yet"
              description="Write the wording once, with merge fields for the client and the price, and reuse it on every deal."
              action={canManage ? add : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {canManage && <div>{add}</div>}
          <ul className="grid gap-3">
            {templates.map((template) => (
              <li key={template.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {template.name}
                        <Badge variant="outline">{CONTRACT_KIND_LABEL[template.kind]}</Badge>
                        {!template.active && <StatusBadge tone="neutral">Inactive</StatusBadge>}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {template.used === 0
                          ? "Not used yet"
                          : `Used on ${template.used} ${template.used === 1 ? "contract" : "contracts"}`}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => setEditing(template)}>
                          <Pencil aria-hidden="true" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${template.name}`}
                          onClick={() => setDeleting(template)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing && (
        <TemplateDialog
          template={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description={
          deleting && deleting.used > 0
            ? "Contracts were made from it, so it can't be deleted. Switch it to inactive instead."
            : "Contracts already made from it are not affected."
        }
        confirmLabel="Delete"
        destructive
        pending={pending}
        onConfirm={() =>
          deleting &&
          run(() => deleteTemplate(deleting.id), {
            success: "Deleted.",
            onSuccess: () => {
              setDeleting(null);
              router.refresh();
            },
          })
        }
      />
    </>
  );
}

function TemplateDialog({
  template,
  onClose,
}: {
  template: TemplateView | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [name, setName] = useState(template?.name ?? "");
  const [kind, setKind] = useState<ContractKind>(template?.kind ?? "contract");
  const [body, setBody] = useState(template?.body ?? "");
  const [active, setActive] = useState(template?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const area = useRef<HTMLTextAreaElement>(null);

  /** Puts a merge field at the cursor. */
  function insert(key: string) {
    const element = area.current;
    const token = `{{${key}}}`;
    if (!element) return setBody((current) => current + token);
    const { selectionStart, selectionEnd } = element;
    setBody(body.slice(0, selectionStart) + token + body.slice(selectionEnd));
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(selectionStart + token.length, selectionStart + token.length);
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent scrollable className="sm:max-w-2xl">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setErrors({});
            run(() => saveTemplate(template?.id ?? null, { name, kind, body, active }), {
              success: "Saved.",
              onSuccess: () => {
                onClose();
                router.refresh();
              },
              onFieldErrors: setErrors,
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{template ? "Edit template" : "Add a template"}</DialogTitle>
            <DialogDescription>
              Changing a template never changes contracts already made from it.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
              <Field id="template-name" label="Name" required error={errors.name}>
                <Input
                  id="template-name"
                  value={name}
                  aria-invalid={!!errors.name}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
              <Field id="template-kind" label="Type">
                <Select
                  value={kind}
                  onValueChange={(value) => value && setKind(value as ContractKind)}
                >
                  <SelectTrigger id="template-kind" className="w-full">
                    <SelectValue>{CONTRACT_KIND_LABEL[kind]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_KINDS.map((entry) => (
                      <SelectItem key={entry} value={entry}>
                        {CONTRACT_KIND_LABEL[entry]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field id="template-body" label="Wording" required error={errors.body}>
              <Textarea
                id="template-body"
                ref={area}
                rows={14}
                className="font-mono text-sm"
                value={body}
                aria-invalid={!!errors.body}
                onChange={(event) => setBody(event.target.value)}
              />
            </Field>
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs">
                Merge fields (filled in from the deal). Click one to add it where the cursor is.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MERGE_FIELDS.map((field) => (
                  <Button
                    key={field.key}
                    type="button"
                    variant="outline"
                    size="xs"
                    title={field.label}
                    onClick={() => insert(field.key)}
                  >
                    {field.label}
                  </Button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={active} onCheckedChange={setActive} /> Available when drafting a
              contract
            </label>
          </DialogBody>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
