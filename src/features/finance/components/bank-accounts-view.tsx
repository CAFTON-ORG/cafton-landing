"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, ArchiveRestore, Landmark, Pencil, Plus } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Field } from "@/components/dashboard/shared/field";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
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
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import { saveBankAccount, setBankAccountActive } from "../actions/bank";
import type { BankAccountView } from "../types/bank";
import type { BillAccount } from "../types/payables";

interface Draft {
  id?: string;
  name: string;
  accountId: string;
  numberHint: string;
}

/** The bank and e-wallet accounts the business keeps, and how far each statement has been checked. */
export function BankAccountsView({
  accounts,
  assetAccounts,
}: {
  accounts: BankAccountView[];
  /** Asset accounts from the chart that are not used by a bank account yet (plus the one being edited). */
  assetAccounts: BillAccount[];
}) {
  const router = useRouter();
  const canManage = useCan("bank:manage");
  const { run, pending } = useServerAction();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showArchived, setShowArchived] = useState(false);

  const visible = accounts.filter((account) => account.active || showArchived);
  const archivedCount = accounts.filter((account) => !account.active).length;
  const used = new Set(accounts.map((account) => account.accountId));
  const choices = assetAccounts.filter(
    (account) => !used.has(account.id) || account.id === draft?.accountId,
  );
  const chosen = assetAccounts.find((account) => account.id === draft?.accountId);

  const add = (
    <Button
      onClick={() => {
        setErrors({});
        setDraft({
          name: "",
          accountId: (choices.find((a) => a.systemKey === "bank") ?? choices[0])?.id ?? "",
          numberHint: "",
        });
      }}
    >
      <Plus aria-hidden="true" /> New bank account
    </Button>
  );

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setErrors({});
    run(
      () =>
        saveBankAccount({
          id: draft.id,
          name: draft.name,
          accountId: draft.accountId,
          numberHint: draft.numberHint,
        }),
      {
        success: draft.id ? "Bank account updated." : "Bank account added.",
        onSuccess: () => {
          setDraft(null);
          router.refresh();
        },
        onFieldErrors: setErrors,
      },
    );
  }

  return (
    <>
      {canManage && accounts.length > 0 && <div className="mb-4 flex justify-end">{add}</div>}
      <Card>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title="No bank accounts yet"
              description="Add the account at your bank, import its statement, and check each line against the books."
              action={canManage ? add : undefined}
            />
          ) : (
            <ul className="divide-y">
              {visible.map((account) => (
                <li key={account.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <Link
                        href={`/dashboard/finance/bank/${account.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {account.name}
                      </Link>
                      {account.numberHint && (
                        <span className="text-muted-foreground font-normal">
                          ending {account.numberHint}
                        </span>
                      )}
                      {!account.active && <StatusBadge tone="neutral">Archived</StatusBadge>}
                      {account.unmatchedCount > 0 && (
                        <StatusBadge tone="warning">{account.unmatchedCount} to check</StatusBadge>
                      )}
                    </p>
                    <p className="text-muted-foreground line-clamp-1 text-xs">
                      {account.accountName}
                      {account.signedOffThrough
                        ? ` · checked through ${formatDate(account.signedOffThrough)}`
                        : " · not signed off yet"}
                      {account.lastImportAt
                        ? ` · imported ${formatDate(account.lastImportAt)}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="tabular-nums">{formatMinor(account.ledgerBalanceMinor)}</p>
                    <p className="text-muted-foreground text-xs">in the books</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={`/dashboard/finance/bank/${account.id}`} />}
                    >
                      Open
                    </Button>
                    {canManage && (
                      <>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Edit ${account.name}`}
                          onClick={() => {
                            setErrors({});
                            setDraft({
                              id: account.id,
                              name: account.name,
                              accountId: account.accountId,
                              numberHint: account.numberHint ?? "",
                            });
                          }}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`${account.active ? "Archive" : "Restore"} ${account.name}`}
                          disabled={pending}
                          onClick={() =>
                            run(
                              () =>
                                setBankAccountActive({ id: account.id, active: !account.active }),
                              {
                                success: account.active ? "Archived." : "Restored.",
                                onSuccess: () => router.refresh(),
                              },
                            )
                          }
                        >
                          {account.active ? (
                            <Archive aria-hidden="true" />
                          ) : (
                            <ArchiveRestore aria-hidden="true" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {archivedCount > 0 && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <Checkbox
            checked={showArchived}
            onCheckedChange={(checked) => setShowArchived(checked === true)}
          />
          Show {archivedCount} archived
        </label>
      )}

      <Dialog open={draft !== null} onOpenChange={(next) => !next && !pending && setDraft(null)}>
        <DialogContent>
          {draft && (
            <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
              <DialogHeader>
                <DialogTitle>{draft.id ? "Edit bank account" : "New bank account"}</DialogTitle>
                <DialogDescription>
                  Each one is tied to an asset account in your chart, so the statement can be
                  checked against what the books say.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="grid gap-4">
                <Field id="bank-name" label="Name" required error={errors.name}>
                  <Input
                    id="bank-name"
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    aria-invalid={!!errors.name}
                    placeholder="BPI Checking"
                    autoComplete="off"
                  />
                </Field>
                <Field
                  id="bank-ledger"
                  label="Account in the books"
                  required
                  error={errors.accountId}
                >
                  <Select
                    value={draft.accountId}
                    onValueChange={(next) => setDraft({ ...draft, accountId: String(next) })}
                  >
                    <SelectTrigger id="bank-ledger" className="w-full">
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
                  id="bank-hint"
                  label="Last digits of the number"
                  hint="Only the last few, to tell two accounts apart."
                >
                  <Input
                    id="bank-hint"
                    value={draft.numberHint}
                    maxLength={6}
                    onChange={(event) => setDraft({ ...draft, numberHint: event.target.value })}
                  />
                </Field>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setDraft(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending || !draft.name.trim() || !draft.accountId}>
                  {pending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
