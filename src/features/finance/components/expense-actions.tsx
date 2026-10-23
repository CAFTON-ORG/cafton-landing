"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Ban, Check, Download, Paperclip, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { useServerAction } from "@/hooks/use-server-action";
import {
  approveExpense,
  deleteReceipt,
  rejectExpense,
  uploadReceipt,
  voidExpense,
  withdrawExpense,
} from "../actions/expenses";
import type { ReceiptView } from "../expense-types";
import { MAX_RECEIPTS, RECEIPT_ACCEPT } from "../expenses";
import { ReasonDialog } from "./reason-dialog";

/** Approve, send back or void: what an approver can do with an expense. */
export function ExpenseDecisionButtons({
  id,
  number,
  status,
}: {
  id: string;
  number?: string;
  status: "submitted" | "approved" | "rejected" | "void";
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  return (
    <div className="flex flex-wrap gap-2">
      {status === "submitted" && (
        <>
          <Button
            disabled={pending}
            onClick={() =>
              run(() => approveExpense(id), {
                success: (data) => `Approved ${data?.number ?? "the expense"}.`,
                onSuccess: () => router.refresh(),
              })
            }
          >
            <Check aria-hidden="true" /> Approve
          </Button>
          <ReasonDialog
            title="Send this expense back?"
            description="The person who submitted it is told why, and can fix it and submit it again."
            confirmLabel="Send back"
            success="Sent back."
            onConfirm={(reason) => rejectExpense({ id, reason })}
            onDone={() => router.refresh()}
            trigger={(open) => (
              <Button variant="outline" onClick={open}>
                <Undo2 aria-hidden="true" /> Send back
              </Button>
            )}
          />
        </>
      )}
      {status === "approved" && (
        <ReasonDialog
          title={`Void ${number}?`}
          description={`${number} stays on record, marked void, and its posting is reversed in the books.`}
          confirmLabel="Void expense"
          success="Expense voided."
          onConfirm={(reason) => voidExpense({ id, reason })}
          onDone={() => router.refresh()}
          trigger={(open) => (
            <Button variant="outline" onClick={open}>
              <Ban aria-hidden="true" /> Void
            </Button>
          )}
        />
      )}
    </div>
  );
}

/** Takes back an expense that has not been approved. */
export function WithdrawExpenseButton({ id }: { id: string }) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" disabled={pending} onClick={() => setOpen(true)}>
        <Trash2 aria-hidden="true" /> Withdraw
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Withdraw this expense?"
        description="It is deleted along with its receipts. Nothing has been posted to the books yet."
        confirmLabel="Withdraw"
        destructive
        pending={pending}
        onConfirm={() =>
          run(() => withdrawExpense(id), {
            success: "Expense withdrawn.",
            onSuccess: () => router.push("/dashboard/finance/expenses"),
          })
        }
      />
    </>
  );
}

const size = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** The receipts on an expense: open, add (while it can still change) and remove. */
export function ReceiptsCard({
  expenseId,
  receipts,
  canChange,
  required,
}: {
  expenseId: string;
  receipts: ReceiptView[];
  /** Whether this person can still add or remove receipts (the expense is not approved, and it is theirs or they approve). */
  canChange: boolean;
  /** The expense is over the amount that needs one. */
  required: boolean;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function add(files: File[]) {
    setBusy(true);
    for (const file of files) {
      const form = new FormData();
      form.set("expenseId", expenseId);
      form.set("file", file);
      const result = await uploadReceipt(form);
      if (result.ok) toast.success(`Added ${file.name}.`);
      else toast.error(result.error);
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receipts</CardTitle>
        <CardDescription>
          {required && receipts.length === 0
            ? "This one needs a receipt before it can be approved."
            : "A photo or PDF of what was paid."}
        </CardDescription>
        {canChange && (
          <CardAction>
            <input
              ref={input}
              type="file"
              multiple
              accept={RECEIPT_ACCEPT}
              className="sr-only"
              aria-label="Choose receipt files"
              tabIndex={-1}
              onChange={(event) => add(Array.from(event.target.files ?? []).slice(0, MAX_RECEIPTS))}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={busy || receipts.length >= MAX_RECEIPTS}
              onClick={() => input.current?.click()}
            >
              <Paperclip aria-hidden="true" /> {busy ? "Adding…" : "Add receipt"}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {receipts.length === 0 ? (
          <EmptyState compact title="No receipts" />
        ) : (
          <ul className="divide-y">
            {receipts.map((receipt) => (
              <li key={receipt.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-medium">{receipt.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {size(receipt.sizeBytes)} · added by {receipt.uploadedByName}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  nativeButton={false}
                  render={<a href={`/api/finance/receipts/${receipt.id}`} download />}
                >
                  <Download aria-hidden="true" /> Open
                </Button>
                {canChange && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove ${receipt.name}`}
                    disabled={pending}
                    onClick={() =>
                      run(() => deleteReceipt(receipt.id), {
                        success: "Receipt removed.",
                        onSuccess: () => router.refresh(),
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
      </CardContent>
    </Card>
  );
}
