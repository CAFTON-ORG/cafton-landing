"use client";

import { useState, type ReactNode } from "react";

import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import type { ActionResult } from "@/lib/actions";

/**
 * A dialog that asks why before voiding or sending something back. Finance records are voided with a
 * reason, never deleted. Give it a `trigger` and it opens itself, or control it with `open` (for a
 * menu item, which can't hold the dialog: the menu closes and takes it away).
 */
export function ReasonDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  title,
  description,
  confirmLabel,
  success,
  onConfirm,
  onDone,
}: {
  trigger?: (open: () => void) => ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  success: string;
  onConfirm: (reason: string) => Promise<ActionResult>;
  onDone: () => void;
}) {
  const { run, pending } = useServerAction();
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = onOpenChange ?? setOwnOpen;
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    run(() => onConfirm(reason), {
      success,
      onSuccess: () => {
        setOpen(false);
        onDone();
      },
      onFieldErrors: (errors) => setError(errors.reason ?? errors.form ?? ""),
    });
  }

  return (
    <>
      {trigger?.(() => {
        setReason("");
        setError("");
        setOpen(true);
      })}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          if (next) {
            setReason("");
            setError("");
          }
          setOpen(next);
        }}
      >
        <DialogContent>
          <form onSubmit={submit} noValidate className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <Field id="void-reason" label="Why" required error={error}>
              <Textarea
                id="void-reason"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                aria-invalid={!!error}
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={pending || !reason.trim()}>
                {pending ? "Working…" : confirmLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
