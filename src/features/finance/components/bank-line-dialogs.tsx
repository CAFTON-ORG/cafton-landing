"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
} from "@/components/dashboard/ui/dialog";
import { Input } from "@/components/dashboard/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import { bookLine, ignoreLine, matchLine, suggestForLine } from "../actions/bank";
import type { LedgerCandidate } from "../bank";
import type { BankLineRow, BookingAccount } from "../bank-types";

const summary = (line: BankLineRow) =>
  `${formatDate(line.date)} · ${line.description} · ${line.amountMinor > 0 ? "in" : "out"} ${formatMinor(Math.abs(line.amountMinor))}`;

/* Each dialog is a shell around a body that is mounted fresh for every line, so the form starts
   empty without resetting state from an effect. */

/** Puts a statement line against a posting the books already have. */
export function MatchDialog({ line, onClose }: { line: BankLineRow | null; onClose: () => void }) {
  return (
    <Dialog open={line !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        {line && <MatchBody key={line.id} line={line} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function MatchBody({ line, onClose }: { line: BankLineRow; onClose: () => void }) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [found, setFound] = useState<LedgerCandidate[] | null>(null);
  const [picked, setPicked] = useState("");

  useEffect(() => {
    let current = true;
    suggestForLine(line.id).then((result) => {
      if (!current) return;
      const list = result.ok ? (result.data ?? []) : [];
      setFound(list);
      if (list.length === 1) setPicked(list[0].lineId);
    });
    return () => {
      current = false;
    };
  }, [line.id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DialogHeader>
        <DialogTitle>Match to a posting</DialogTitle>
        <DialogDescription>{summary(line)}</DialogDescription>
      </DialogHeader>
      <DialogBody className="grid gap-3">
        {found === null && <p className="text-muted-foreground text-sm">Looking…</p>}
        {found?.length === 0 && (
          <p className="text-muted-foreground text-sm">
            The books have no posting of this amount in this direction near this date. If it
            isn&apos;t recorded yet, book it instead.
          </p>
        )}
        {found && found.length > 0 && (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Postings it could be</legend>
            {found.map((candidate) => (
              <label
                key={candidate.lineId}
                className="has-[:checked]:border-primary flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm"
              >
                <input
                  type="radio"
                  name="candidate"
                  className="mt-1"
                  checked={picked === candidate.lineId}
                  onChange={() => setPicked(candidate.lineId)}
                />
                <span className="min-w-0">
                  <span className="block font-medium">
                    {candidate.entryNumber} · {formatDate(candidate.entryDate)}
                  </span>
                  <span className="text-muted-foreground line-clamp-2 block text-xs">
                    {candidate.memo}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={pending || !picked}
          onClick={() =>
            run(() => matchLine({ lineId: line.id, ledgerLineId: picked }), {
              success: "Matched.",
              onSuccess: () => {
                onClose();
                router.refresh();
              },
            })
          }
        >
          {pending ? "Matching…" : "Match"}
        </Button>
      </DialogFooter>
    </div>
  );
}

/** Books a line the books don't have yet (a bank charge, interest, a deposit). */
export function BookDialog({
  line,
  accounts,
  onClose,
}: {
  line: BankLineRow | null;
  accounts: BookingAccount[];
  onClose: () => void;
}) {
  return (
    <Dialog open={line !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        {line && <BookBody key={line.id} line={line} accounts={accounts} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function BookBody({
  line,
  accounts,
  onClose,
}: {
  line: BankLineRow;
  accounts: BookingAccount[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [accountId, setAccountId] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  const moneyIn = line.amountMinor > 0;
  const choices = accounts.filter((account) =>
    moneyIn
      ? ["revenue", "equity", "liability", "asset"].includes(account.type)
      : ["expense", "equity", "liability", "asset"].includes(account.type),
  );
  const chosen = accounts.find((account) => account.id === accountId);

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        run(() => bookLine({ lineId: line.id, counterAccountId: accountId, memo }), {
          success: (data) => `Booked as ${data?.entryNumber ?? "an entry"}.`,
          onSuccess: () => {
            onClose();
            router.refresh();
          },
          onFieldErrors: (errors) => setError(Object.values(errors)[0] ?? ""),
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>Book this line</DialogTitle>
        <DialogDescription>
          {summary(line)}. It is posted to the books between the bank and the account you choose.
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="grid gap-4">
        <Field
          id="book-account"
          label={moneyIn ? "Where the money came from" : "What it was for"}
          required
          error={error}
        >
          <Select value={accountId} onValueChange={(next) => setAccountId(String(next))}>
            <SelectTrigger id="book-account" className="w-full">
              <SelectValue placeholder="Choose an account">
                {chosen ? `${chosen.code} ${chosen.name}` : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {choices.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.code} {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          id="book-memo"
          label="Note"
          hint="Shown on the entry. Defaults to the bank's description."
        >
          <Input id="book-memo" value={memo} onChange={(event) => setMemo(event.target.value)} />
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !accountId}>
          {pending ? "Booking…" : "Book it"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Sets a line aside with a reason (a bank error that corrected itself, for example). */
export function IgnoreDialog({ line, onClose }: { line: BankLineRow | null; onClose: () => void }) {
  return (
    <Dialog open={line !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        {line && <IgnoreBody key={line.id} line={line} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function IgnoreBody({ line, onClose }: { line: BankLineRow; onClose: () => void }) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        run(() => ignoreLine({ lineId: line.id, note }), {
          success: "Set aside.",
          onSuccess: () => {
            onClose();
            router.refresh();
          },
          onFieldErrors: (errors) => setError(errors.note ?? Object.values(errors)[0] ?? ""),
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>Set this line aside</DialogTitle>
        <DialogDescription>
          {summary(line)}. It counts as dealt with but nothing is posted. Use it for something that
          cancels itself out.
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        <Field id="ignore-note" label="Why" required error={error}>
          <Textarea
            id="ignore-note"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            aria-invalid={!!error}
          />
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !note.trim()}>
          {pending ? "Saving…" : "Set aside"}
        </Button>
      </DialogFooter>
    </form>
  );
}
