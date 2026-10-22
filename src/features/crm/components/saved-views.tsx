"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bookmark, Check, Plus, Trash2, Users } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/dashboard/ui/popover";
import { useServerAction } from "@/hooks/use-server-action";
import {
  deleteView,
  listSavedViews,
  saveView,
  type SavedViewItem,
  type ViewResource,
} from "../actions/views";

const stripPage = (params: URLSearchParams) => {
  const copy = new URLSearchParams(params);
  copy.delete("page");
  return copy.toString();
};

/** "Views": jump to a saved search of this list, or save the current one under a name. */
export function SavedViews({ resource }: { resource: ViewResource }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const canShare = useCan(`${resource}:update`);
  const { run, pending } = useServerAction();
  const [views, setViews] = useState<SavedViewItem[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [error, setError] = useState("");
  const current = stripPage(new URLSearchParams(params));

  const load = () =>
    run(() => listSavedViews(resource), { onSuccess: (data) => setViews(data ?? []) });

  return (
    <>
      <Popover onOpenChange={(open) => open && load()}>
        <PopoverTrigger render={<Button variant="outline" />}>
          <Bookmark aria-hidden="true" /> Views
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72">
          {views === null ? (
            <p className="text-muted-foreground px-1 py-2 text-sm">Loading…</p>
          ) : views.length === 0 ? (
            <p className="text-muted-foreground px-1 py-2 text-sm">
              No saved views yet. Search or filter the list, then save it here to come back in one
              click.
            </p>
          ) : (
            <ul className="grid gap-0.5">
              {views.map((view) => (
                <li key={view.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => router.push(`${pathname}?${view.query}`)}
                    className="hover:bg-accent focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {view.query === current ? (
                      <Check className="size-4 shrink-0" aria-hidden="true" />
                    ) : view.shared ? (
                      <Users
                        className="text-muted-foreground size-4 shrink-0"
                        aria-label="Shared with the team"
                      />
                    ) : (
                      <span className="size-4 shrink-0" />
                    )}
                    <span className="truncate">{view.name}</span>
                  </button>
                  {view.mine && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete the view ${view.name}`}
                      disabled={pending}
                      onClick={() =>
                        run(() => deleteView(view.id), {
                          success: "View deleted.",
                          onSuccess: () =>
                            setViews((list) => list?.filter((v) => v.id !== view.id) ?? null),
                        })
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={!current}
            onClick={() => {
              setName("");
              setShared(false);
              setError("");
              setSaving(true);
            }}
          >
            <Plus aria-hidden="true" /> Save this search as a view
          </Button>
        </PopoverContent>
      </Popover>

      <Dialog open={saving} onOpenChange={(open) => !pending && setSaving(open)}>
        <DialogContent>
          <form
            className="grid gap-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              setError("");
              run(() => saveView({ resource, name, query: current, shared }), {
                success: "View saved.",
                onSuccess: () => {
                  setSaving(false);
                  setViews(null);
                },
                onFieldErrors: (errors) => setError(errors.name ?? Object.values(errors)[0] ?? ""),
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Save this search as a view</DialogTitle>
              <DialogDescription>
                It keeps the search, filters and sort you have on screen right now.
              </DialogDescription>
            </DialogHeader>
            <Field id="view-name" label="Name" required error={error}>
              <Input
                id="view-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. New leads I own"
                aria-invalid={!!error}
                autoComplete="off"
              />
            </Field>
            {canShare && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="view-shared"
                  checked={shared}
                  onCheckedChange={(checked) => setShared(checked === true)}
                />
                <Label htmlFor="view-shared" className="text-sm leading-snug font-normal">
                  Share with the team
                </Label>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSaving(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending ? "Saving…" : "Save view"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
