"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";

import { DatePicker } from "@/components/dashboard/shared/date-picker";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { formatMinor, parseMinor } from "@/lib/money";
import { postManualEntry } from "../actions/books";
import { MAX_ENTRY_LINES, entryTotals } from "../rules/core";

interface Line {
  accountId: string;
  debit: string;
  credit: string;
}

const emptyLine = (): Line => ({ accountId: "", debit: "", credit: "" });

/** Type in a journal entry: the date, what it is for, and the lines. It only saves when debits equal credits. */
export function EntryDialog({
  accounts,
  today,
  trigger,
}: {
  accounts: { id: string; code: string; name: string }[];
  today: string;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const label = (id: string) => {
    const account = accounts.find((item) => item.id === id);
    return account ? `${account.code} ${account.name}` : "Choose an account";
  };

  const totals = useMemo(() => {
    const parse = (text: string) => (text.trim() ? parseMinor(text) : 0);
    const parsed = lines.map((line) => ({
      accountId: line.accountId,
      debitMinor: parse(line.debit) ?? 0,
      creditMinor: parse(line.credit) ?? 0,
    }));
    return entryTotals(parsed);
  }, [lines]);
  const balanced = totals.differenceMinor === 0 && totals.debitMinor > 0;
  const ready = balanced && lines.every((line) => line.accountId) && memo.trim().length > 0;

  function reset() {
    setDate(today);
    setMemo("");
    setLines([emptyLine(), emptyLine()]);
    setErrors({});
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    run(() => postManualEntry({ date, memo, lines }), {
      success: (data) => `Posted ${data?.number ?? "the entry"}.`,
      onSuccess: (data) => {
        setOpen(false);
        reset();
        const posted = data as { id: string } | undefined;
        if (posted) router.push(`/dashboard/finance/journal/${posted.id}`);
        else router.refresh();
      },
      onFieldErrors: setErrors,
    });
  }

  const set = (index: number, patch: Partial<Line>) =>
    setLines((current) => current.map((line, at) => (at === index ? { ...line, ...patch } : line)));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent scrollable className="sm:max-w-3xl">
        <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>New journal entry</DialogTitle>
            <DialogDescription>
              Every entry has debits and credits that add up to the same amount. Once posted it can
              only be reversed, never edited.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
              <Field id="entry-date" label="Date" required error={errors.date}>
                <DatePicker id="entry-date" value={date} onChange={setDate} />
              </Field>
              <Field id="entry-memo" label="What is it for?" required error={errors.memo}>
                <Textarea
                  id="entry-memo"
                  rows={1}
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  aria-invalid={!!errors.memo}
                  placeholder="e.g. Owner put in cash to start the year"
                />
              </Field>
            </div>

            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">Lines</legend>
              <div className="text-muted-foreground hidden grid-cols-[1fr_8rem_8rem_2rem] gap-2 px-0.5 text-xs sm:grid">
                <span>Account</span>
                <span className="text-right">Debit (₱)</span>
                <span className="text-right">Credit (₱)</span>
                <span />
              </div>
              {lines.map((line, index) => (
                <div
                  key={index}
                  className="grid gap-2 sm:grid-cols-[1fr_8rem_8rem_2rem] sm:items-start"
                >
                  <div className="grid gap-1">
                    <Select
                      value={line.accountId}
                      onValueChange={(next) => set(index, { accountId: String(next) })}
                    >
                      <SelectTrigger aria-label={`Line ${index + 1} account`} className="w-full">
                        <SelectValue placeholder="Choose an account">
                          {label(line.accountId)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.code} {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors[`line${index}`] && (
                      <p className="text-destructive text-xs">{errors[`line${index}`]}</p>
                    )}
                  </div>
                  <Input
                    aria-label={`Line ${index + 1} debit`}
                    inputMode="decimal"
                    value={line.debit}
                    onChange={(event) =>
                      set(index, {
                        debit: event.target.value,
                        credit: event.target.value ? "" : line.credit,
                      })
                    }
                    className="text-right tabular-nums"
                    placeholder="0.00"
                  />
                  <Input
                    aria-label={`Line ${index + 1} credit`}
                    inputMode="decimal"
                    value={line.credit}
                    onChange={(event) =>
                      set(index, {
                        credit: event.target.value,
                        debit: event.target.value ? "" : line.debit,
                      })
                    }
                    className="text-right tabular-nums"
                    placeholder="0.00"
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove line ${index + 1}`}
                    disabled={lines.length <= 2}
                    onClick={() => setLines((current) => current.filter((_, at) => at !== index))}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={lines.length >= MAX_ENTRY_LINES}
                  onClick={() => setLines((current) => [...current, emptyLine()])}
                >
                  <Plus aria-hidden="true" /> Add a line
                </Button>
              </div>
            </fieldset>

            <div
              role="status"
              className={`grid gap-1 rounded-lg border px-3 py-2 text-sm sm:grid-cols-[1fr_8rem_8rem_2rem] sm:gap-2 ${
                balanced ? "border-emerald-500/40 bg-emerald-500/10" : "bg-muted/40"
              }`}
            >
              <span className="font-medium">
                {totals.debitMinor === 0 && totals.creditMinor === 0
                  ? "Enter the amounts"
                  : balanced
                    ? "Balanced"
                    : `Out of balance by ${formatMinor(Math.abs(totals.differenceMinor))}`}
              </span>
              <span className="tabular-nums sm:text-right">{formatMinor(totals.debitMinor)}</span>
              <span className="tabular-nums sm:text-right">{formatMinor(totals.creditMinor)}</span>
              <span />
            </div>
            {errors.form && <p className="text-destructive text-sm">{errors.form}</p>}
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
            <Button type="submit" disabled={pending || !ready}>
              {pending ? "Posting…" : "Post entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
