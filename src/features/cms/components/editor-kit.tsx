"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dashboard/ui/tabs";
import { useServerAction } from "@/hooks/use-server-action";
import type { ActionResult } from "@/lib/actions";
import type { PublishIntent } from "../admin/schema";
import { STATUS_LABEL } from "../admin/types";
import type { PublishStatus } from "../rules";

/* ------------------------------------------------------------ editor state */

/**
 * State and saving shared by every content editor: the form values, per-field errors from
 * the server, a warning before leaving with unsaved changes, and the save / publish /
 * unpublish round trip (a new item moves to its own edit page after the first save).
 */
export function useContentEditor<T extends { status?: PublishStatus }>({
  initial,
  isNew,
  save,
  editHref,
  listHref,
}: {
  initial: T;
  isNew: boolean;
  save: (values: T, intent: PublishIntent) => Promise<ActionResult<{ id: string }>>;
  /** Where an existing item's editor lives, given its id. */
  editHref: (id: string) => string;
  listHref: string;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof T>(key: K, value: T[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  function submit(intent: PublishIntent = "save") {
    setErrors({});
    run(() => save(values, intent), {
      success:
        intent === "publish"
          ? "Published. It is live on the website."
          : intent === "unpublish"
            ? "Unpublished."
            : "Saved.",
      onSuccess: (data) => {
        if (isNew && data?.id) router.replace(editHref(data.id));
        else router.refresh();
        if (intent !== "save")
          setValues((current) => ({
            ...current,
            status: intent === "publish" ? "published" : "draft",
          }));
      },
      onFieldErrors: (fieldErrors) => {
        setErrors(fieldErrors);
        toast.error(fieldErrors.form ?? "Check the highlighted fields.");
      },
    });
  }

  return {
    values,
    set,
    setValues,
    errors,
    pending,
    dirty,
    submit,
    published: values.status === "published",
    listHref,
  };
}

/* ------------------------------------------------------------ publish card */

export function PublishPanel({
  status,
  readiness,
  pending,
  dirty,
  isNew,
  onSubmit,
  listHref,
  listLabel,
  publicHref,
  error,
  liveNote,
}: {
  status: PublishStatus;
  /** Why it can't be published yet, or null when it can. */
  readiness: string | null;
  pending: boolean;
  dirty: boolean;
  isNew: boolean;
  onSubmit: (intent: PublishIntent) => void;
  listHref: string;
  listLabel: string;
  publicHref?: string;
  error?: string;
  liveNote?: string;
}) {
  const canPublish = useCan("content:publish");
  const published = status === "published";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Publishing{" "}
          <StatusBadge tone={published ? "success" : "neutral"}>{STATUS_LABEL[status]}</StatusBadge>
        </CardTitle>
        <CardDescription>
          {published
            ? (liveNote ?? "This is live on the website. Saving updates it immediately.")
            : (readiness ?? "Ready to publish.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending || !dirty}>
          <Save aria-hidden="true" />{" "}
          {pending ? "Saving…" : published ? "Save changes" : isNew ? "Create draft" : "Save draft"}
        </Button>
        {canPublish &&
          (published ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onSubmit("unpublish")}
            >
              <EyeOff aria-hidden="true" /> Unpublish
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={pending || !!readiness}
              title={readiness ?? undefined}
              onClick={() => onSubmit("publish")}
            >
              <Eye aria-hidden="true" /> Publish
            </Button>
          ))}
        {publicHref && published && (
          <Button
            type="button"
            variant="ghost"
            nativeButton={false}
            render={<a href={publicHref} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLink aria-hidden="true" /> View on the site
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          nativeButton={false}
          render={<Link href={listHref} />}
        >
          {listLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------- tabs */

export interface EditorTabSpec {
  value: string;
  label: string;
  /** Field names (prefixes) that live on this tab, so errors can point at it. */
  fields: string[];
}

/**
 * Splits a long editor into sections instead of one tall column of cards. A tab with a
 * problem gets a marker, and the first tab with a problem opens itself after a failed save.
 */
export function EditorTabs({
  tabs,
  errors,
  children,
}: {
  tabs: EditorTabSpec[];
  errors: Record<string, string>;
  children: ReactNode;
}) {
  const [active, setActive] = useState(tabs[0].value);
  const hasError = (tab: EditorTabSpec) =>
    Object.keys(errors).some((key) => tab.fields.some((field) => key.startsWith(field)));
  const firstBad = tabs.find(hasError)?.value;

  // A new set of errors opens the first tab that has one (not when the person just switches tabs).
  const [seen, setSeen] = useState(errors);
  if (errors !== seen) {
    setSeen(errors);
    if (firstBad) setActive(firstBad);
  }

  return (
    <Tabs
      value={active}
      onValueChange={(value) => setActive(String(value))}
      className="min-w-0 content-start gap-4"
    >
      <div className="max-w-full overflow-x-auto">
        <TabsList variant="line" className="h-9! border-b-0">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="px-3">
              {tab.label}
              {hasError(tab) && (
                <>
                  <span className="bg-destructive size-1.5 rounded-full" aria-hidden="true" />
                  <span className="sr-only">has problems</span>
                </>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {children}
    </Tabs>
  );
}

export function EditorTab({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsContent value={value} className="grid content-start gap-4">
      {children}
    </TabsContent>
  );
}

/* ---------------------------------------------------------------- repeater */

/**
 * A list the editor can add to, remove from and reorder: gallery images, prizes, steps,
 * links, questions. `render` draws one item's fields and gets an `update(patch)` for it.
 */
export function Repeater<T>({
  label,
  hint,
  items,
  onChange,
  create,
  render,
  itemName,
  addLabel,
  max = 30,
  error,
}: {
  label: string;
  hint?: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  render: (item: T, index: number, update: (patch: Partial<T>) => void) => ReactNode;
  itemName: string;
  addLabel?: string;
  max?: number;
  error?: string;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange(next);
  };

  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium">{label}</legend>
      {hint && <p className="text-muted-foreground -mt-1 text-xs">{hint}</p>}
      {items.length === 0 && <p className="text-muted-foreground text-sm">None yet.</p>}
      <ol className="grid gap-3">
        {items.map((item, index) => (
          <li key={index} className="bg-muted/30 grid gap-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs font-medium">
                {itemName} {index + 1}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === 0}
                  aria-label={`Move ${itemName} ${index + 1} up`}
                  onClick={() => move(index, index - 1)}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === items.length - 1}
                  aria-label={`Move ${itemName} ${index + 1} down`}
                  onClick={() => move(index, index + 1)}
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${itemName} ${index + 1}`}
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>
            {render(item, index, (patch) =>
              onChange(items.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))),
            )}
          </li>
        ))}
      </ol>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={items.length >= max}
          onClick={() => onChange([...items, create()])}
        >
          <Plus aria-hidden="true" /> {addLabel ?? `Add ${itemName.toLowerCase()}`}
        </Button>
      </div>
    </fieldset>
  );
}
