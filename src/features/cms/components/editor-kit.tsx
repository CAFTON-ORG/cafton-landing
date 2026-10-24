"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
import { FormActions } from "@/components/dashboard/shared/form-action-bar";
import { Button } from "@/components/dashboard/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dashboard/ui/tabs";
import { cn } from "@/lib/utils";
import { useServerAction } from "@/hooks/use-server-action";
import type { ActionResult } from "@/lib/actions";
import type { PublishIntent } from "../schemas/admin";
import { STATUS_LABEL } from "../types/admin";
import type { PublishStatus } from "../rules/core";

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

  /** Throws the changes away: back to what was loaded. */
  function reset() {
    setValues(initial);
    setErrors({});
  }

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
    reset,
    published: values.status === "published",
    listHref,
  };
}

/* ------------------------------------------------------------ publish card */

/**
 * The first card of a content editor's rail: its status, why it can or cannot go live, and the
 * standard actions (Save, Publish or Unpublish, Discard, links).
 */
export function PublishPanel({
  status,
  readiness,
  pending,
  dirty,
  isNew,
  onSubmit,
  onDiscard,
  error,
  listHref,
  listLabel,
  publicHref,
  liveNote,
}: {
  status: PublishStatus;
  /** Why it can't be published yet, or null when it can. */
  readiness: string | null;
  pending: boolean;
  dirty: boolean;
  isNew: boolean;
  onSubmit: (intent: PublishIntent) => void;
  onDiscard: () => void;
  error?: string;
  listHref: string;
  listLabel: string;
  publicHref?: string;
  liveNote?: string;
}) {
  const canPublish = useCan("content:publish");
  const published = status === "published";
  return (
    <FormActions
      title="Status"
      badge={
        <StatusBadge tone={published ? "success" : "neutral"}>{STATUS_LABEL[status]}</StatusBadge>
      }
      description={
        published
          ? (liveNote ?? "This is live on the website. Saving updates it immediately.")
          : (readiness ?? "Ready to publish.")
      }
      dirty={dirty}
      pending={pending}
      error={error}
      onDiscard={onDiscard}
      saveLabel={published ? "Save changes" : isNew ? "Create draft" : "Save draft"}
      secondary={
        canPublish &&
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
        ))
      }
      links={
        <>
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
        </>
      }
    />
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
  rail,
  children,
}: {
  tabs: EditorTabSpec[];
  errors: Record<string, string>;
  /** The right-hand rail. The tab list sits above both columns; the panels and the rail start on one line below it. */
  rail?: ReactNode;
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
      <TabsList className="h-auto max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="min-h-8 px-3 py-1.5">
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
      {rail ? <EditorLayout rail={rail}>{children}</EditorLayout> : children}
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
  fixed = false,
  collapsible = false,
  itemLabels,
  summary,
  forceOpen,
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
  /** No adding or removing: the items are a fixed set that can only be edited and reordered. */
  fixed?: boolean;
  /** Items fold to one line (number and summary) and open on demand, so a long list does not make a long page. */
  collapsible?: boolean;
  /** Names for the items instead of "Item 1". */
  itemLabels?: string[];
  summary?: (item: T, index: number) => string;
  /** Keeps an item open, e.g. when it has an error. */
  forceOpen?: (index: number) => boolean;
  error?: string;
}) {
  const [open, setOpen] = useState<number[]>(items.length === 1 ? [0] : []);
  const isOpen = (index: number) => !collapsible || open.includes(index) || !!forceOpen?.(index);
  const toggle = (index: number) =>
    setOpen((current) =>
      current.includes(index) ? current.filter((i) => i !== index) : [...current, index],
    );
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    next.splice(to, 0, next.splice(from, 1)[0]);
    if (open.includes(from))
      setOpen((current) => current.map((i) => (i === from ? to : i === to ? from : i)));
    onChange(next);
  };

  return (
    <fieldset className="grid min-w-0 gap-3">
      <legend className="text-sm font-medium">{label}</legend>
      {hint && <p className="text-muted-foreground -mt-1 text-xs">{hint}</p>}
      {items.length === 0 && <p className="text-muted-foreground text-sm">None yet.</p>}
      <ol className="grid min-w-0 gap-3">
        {items.map((item, index) => (
          <li key={index} className="bg-muted/30 grid min-w-0 gap-3 rounded-lg border p-3">
            <div className="flex min-w-0 items-center justify-between gap-2">
              {collapsible ? (
                <button
                  type="button"
                  aria-expanded={isOpen(index)}
                  onClick={() => toggle(index)}
                  className="focus-visible:ring-ring flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-md text-left text-sm focus-visible:ring-2 focus-visible:outline-none"
                >
                  <ChevronRight
                    className={cn(
                      "text-muted-foreground size-4 shrink-0 transition-transform",
                      isOpen(index) && "rotate-90",
                    )}
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground shrink-0 text-xs font-medium">
                    {itemLabels?.[index] ?? `${itemName} ${index + 1}`}
                  </span>
                  <span className="truncate font-medium">{summary?.(item, index)}</span>
                </button>
              ) : (
                <span className="text-muted-foreground text-xs font-medium">
                  {itemLabels?.[index] ?? `${itemName} ${index + 1}`}
                </span>
              )}
              <div className="flex shrink-0 gap-1">
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
                {!fixed && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${itemName} ${index + 1}`}
                    onClick={() => onChange(items.filter((_, i) => i !== index))}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
            {isOpen(index) &&
              render(item, index, (patch) =>
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
      {!fixed && (
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
      )}
    </fieldset>
  );
}
