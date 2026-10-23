"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Undo2 } from "lucide-react";

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
import { reverseEntry } from "../actions/books";

/** Undoes a posted entry with a mirrored one. The original stays; the books show both. */
export function ReverseButton({ id, number }: { id: string; number: string }) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    run(() => reverseEntry({ id, reason }), {
      success: (data) => `Reversed with ${data?.number ?? "a new entry"}.`,
      onSuccess: (data) => {
        setOpen(false);
        const made = data as { id: string } | undefined;
        router.push(made ? `/dashboard/finance/journal/${made.id}` : "/dashboard/finance/journal");
      },
      onFieldErrors: (errors) => setError(errors.reason ?? errors.form ?? ""),
    });
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setReason("");
          setError("");
          setOpen(true);
        }}
      >
        <Undo2 aria-hidden="true" /> Reverse
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          <form onSubmit={submit} noValidate className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Reverse {number}?</DialogTitle>
              <DialogDescription>
                A new entry is posted today with every debit and credit swapped, so the accounts
                return to where they were. {number} stays in the books, marked as reversed.
              </DialogDescription>
            </DialogHeader>
            <Field id="reverse-reason" label="Why" required error={error}>
              <Textarea
                id="reverse-reason"
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
              <Button type="submit" disabled={pending || !reason.trim()}>
                {pending ? "Reversing…" : "Reverse the entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
