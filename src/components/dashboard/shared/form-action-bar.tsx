"use client";

import type { ReactNode } from "react";
import { RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { cn } from "@/lib/utils";

/**
 * THE place for a form's actions, on every editing page of the dashboard: the first card of the
 * right-hand rail, which stays in view while the page scrolls (see `EditorLayout`). Top to
 * bottom: where the work stands, the primary Save, a secondary action (Publish), Discard, then
 * links ("View on the site"). Nothing else on a page carries Save.
 *
 * Below the `lg` breakpoint the rail sits under the form, out of reach of a long page, so a bar
 * with Save is fixed to the bottom of the screen instead. It is the same form, so Save is the
 * same button in effect.
 */
export function FormActions({
  title = "Save",
  badge,
  description,
  dirty,
  pending,
  saveLabel = "Save changes",
  onDiscard,
  secondary,
  links,
  error,
  className,
}: {
  title?: ReactNode;
  /** Next to the title, e.g. a status badge. */
  badge?: ReactNode;
  /** A line under the title. Defaults to whether there is anything to save. */
  description?: ReactNode;
  dirty: boolean;
  pending: boolean;
  saveLabel?: string;
  onDiscard?: () => void;
  /** Buttons for actions beside Save, e.g. Publish. They are made full width. */
  secondary?: ReactNode;
  /** Links under the buttons. */
  links?: ReactNode;
  error?: string;
  className?: string;
}) {
  const state = pending ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved";
  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {title} {badge}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="grid gap-2 [&>*]:w-full">
          <p
            role="status"
            className={cn(
              "flex items-center gap-2 text-sm",
              dirty ? "font-medium" : "text-muted-foreground",
            )}
          >
            <span
              aria-hidden="true"
              className={cn("size-2 rounded-full", dirty ? "bg-amber-500" : "bg-emerald-500")}
            />
            {state}
          </p>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <Button type="submit" disabled={!dirty || pending}>
            <Save aria-hidden="true" /> {saveLabel}
          </Button>
          {secondary}
          {onDiscard && (
            <Button type="button" variant="ghost" disabled={!dirty || pending} onClick={onDiscard}>
              <RotateCcw aria-hidden="true" /> Discard changes
            </Button>
          )}
          {links}
        </CardContent>
      </Card>

      <div className="bg-background/95 fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t px-4 py-3 backdrop-blur lg:hidden">
        <p
          className={cn("flex-1 truncate text-sm", dirty ? "font-medium" : "text-muted-foreground")}
        >
          {state}
        </p>
        <Button type="submit" disabled={!dirty || pending}>
          <Save aria-hidden="true" /> {saveLabel}
        </Button>
      </div>
    </>
  );
}
