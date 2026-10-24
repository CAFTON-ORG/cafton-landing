"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { useServerAction } from "@/hooks/use-server-action";
import { createBill } from "../actions/payables";

/** Starts a draft bill for a supplier. */
export function NewBillDialog({
  vendors,
  trigger,
}: {
  vendors: { id: string; name: string }[];
  trigger: ReactNode;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [open, setOpen] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [error, setError] = useState("");
  const vendor = vendors.find((item) => item.id === vendorId);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    run(() => createBill({ vendorId }), {
      success: "Draft started.",
      onSuccess: (data) => {
        setOpen(false);
        const made = data as { id: string } | undefined;
        router.push(made ? `/dashboard/finance/bills/${made.id}` : "/dashboard/finance/bills");
      },
      onFieldErrors: (errors) => setError(Object.values(errors)[0] ?? ""),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (next) {
          setVendorId("");
          setError("");
        }
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>New bill</DialogTitle>
            <DialogDescription>
              Who sent it? You can fill in the lines and dates on the next screen.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <Field id="bill-vendor" label="Supplier" required error={error}>
              {vendors.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Add a supplier first, on the Suppliers page.
                </p>
              ) : (
                <Select value={vendorId} onValueChange={(next) => setVendorId(String(next))}>
                  <SelectTrigger id="bill-vendor" className="w-full">
                    <SelectValue placeholder="Choose a supplier">{vendor?.name}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !vendorId}>
              {pending ? "Starting…" : "Start draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
