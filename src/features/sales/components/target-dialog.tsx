"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Target } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
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
import { useServerAction } from "@/hooks/use-server-action";
import { minorToInput } from "@/lib/money";
import { setSalesTarget } from "../actions/targets";

/** Sets, changes or clears one person's goal for the month on show. */
export function TargetDialog({
  ownerId,
  name,
  month,
  monthLabel,
  targetMinor,
}: {
  ownerId: string;
  name: string;
  month: string;
  monthLabel: string;
  targetMinor: number | null;
}) {
  const canManage = useCan("targets:manage");
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(targetMinor ? minorToInput(targetMinor) : "");
  const [error, setError] = useState<string>();
  if (!canManage) {
    return targetMinor ? null : <span className="text-muted-foreground text-sm">No goal set</span>;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (next) {
          setAmount(targetMinor ? minorToInput(targetMinor) : "");
          setError(undefined);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" aria-label={`Set ${name}'s target for ${monthLabel}`} />
        }
      >
        <Target aria-hidden="true" /> {targetMinor ? "Change" : "Set target"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setError(undefined);
            run(() => setSalesTarget(ownerId, month, amount), {
              success: amount.trim() ? "Target saved." : "Target removed.",
              onSuccess: () => {
                setOpen(false);
                router.refresh();
              },
              onFieldErrors: (errors) => setError(errors.amount),
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {name}: {monthLabel}
            </DialogTitle>
            <DialogDescription>
              How much they aim to win this month. Leave it empty to remove the target.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field id="target-amount" label="Target (PHP)" error={error}>
              <Input
                id="target-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="250,000"
                aria-invalid={!!error}
                autoFocus
              />
            </Field>
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
