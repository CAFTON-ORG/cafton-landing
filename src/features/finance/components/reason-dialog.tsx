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

/** A button that asks why before voiding something. Finance records are voided with a reason, never deleted. */
export function ReasonDialog({
  trigger,
  title,
  description,
  confirmLabel,
  success,
  onConfirm,
  onDone,
}: {
  trigger: (open: () => void) => ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  success: string;
  onConfirm: (reason: string) => Promise<ActionResult>;
  onDone: () => void;
}) {
  const { run, pending } = useServerAction();
  const [open, setOpen] = useState(false);
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
      {trigger(() => {
        setReason("");
        setError("");
        setOpen(true);
      })}
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
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
