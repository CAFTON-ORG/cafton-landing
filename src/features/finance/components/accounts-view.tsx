"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, ArchiveRestore, BookOpen, Pencil, Plus } from "lucide-react";

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
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { formatMinor } from "@/lib/money";
import { saveAccount, setAccountActive } from "../actions/books";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABEL, type AccountType } from "../rules";
import type { AccountView } from "../types";

interface Draft {
  id?: string;
  code: string;
  name: string;
  type: AccountType;
  description: string;
  /** The type can't change: the account has postings, or the system posts to it. */
  locked: boolean;
}

const blank: Draft = { code: "", name: "", type: "expense", description: "", locked: false };

/** The chart of accounts: every account the books can post to, grouped by what it is. */
export function AccountsView({ accounts }: { accounts: AccountView[] }) {
  const router = useRouter();
  const canManage = useCan("finance:manage");
  const { run, pending } = useServerAction();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showArchived, setShowArchived] = useState(false);

  const visible = accounts.filter((account) => account.active || showArchived);
  const archivedCount = accounts.filter((account) => !account.active).length;

  const add = (
    <Button
      onClick={() => {
        setErrors({});
        setDraft(blank);
      }}
    >
      <Plus aria-hidden="true" /> Add an account
    </Button>
  );

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setErrors({});
    run(
      () =>
        saveAccount({
          id: draft.id,
          code: draft.code,
          name: draft.name,
          type: draft.type,
          description: draft.description,
        }),
      {
        success: draft.id ? "Account updated." : "Account added.",
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {archivedCount > 0 ? (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={showArchived}
              onCheckedChange={(checked) => setShowArchived(checked === true)}
            />
            Show {archivedCount} archived
          </label>
        ) : (
          <span />
        )}
        {canManage && accounts.length > 0 && add}
      </div>
      <Card>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No accounts yet"
              description="The chart of accounts is the list of places money can sit or come from."
              action={canManage ? add : undefined}
            />
          ) : (
            ACCOUNT_TYPES.map((type) => {
              const rows = visible.filter((account) => account.type === type);
              if (rows.length === 0) return null;
              return (
                <section key={type} aria-labelledby={`type-${type}`}>
                  <h2
                    id={`type-${type}`}
                    className="bg-muted/40 text-muted-foreground border-b px-4 py-2 text-xs font-medium tracking-wide uppercase not-first:border-t"
                  >
                    {ACCOUNT_TYPE_LABEL[type]}
                  </h2>
                  <ul className="divide-y">
                    {rows.map((account) => (
                      <li key={account.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <span className="text-muted-foreground w-14 shrink-0 text-sm tabular-nums">
                          {account.code}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            {account.name}
                            {account.systemKey && <StatusBadge tone="info">System</StatusBadge>}
                            {!account.active && <StatusBadge tone="neutral">Archived</StatusBadge>}
                          </p>
                          {account.description && (
                            <p className="text-muted-foreground line-clamp-1 text-xs">
                              {account.description}
                            </p>
                          )}
                        </div>
                        <span className="text-sm tabular-nums">
                          {formatMinor(account.balanceMinor)}
                        </span>
                        {canManage && (
                          <div className="flex gap-1">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Edit ${account.name}`}
                              onClick={() => {
                                setErrors({});
                                setDraft({
                                  id: account.id,
                                  code: account.code,
                                  name: account.name,
                                  type: account.type,
                                  description: account.description ?? "",
                                  locked: account.used || !!account.systemKey,
                                });
                              }}
                            >
                              <Pencil aria-hidden="true" />
                            </Button>
                            {!account.systemKey && (
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`${account.active ? "Archive" : "Restore"} ${account.name}`}
                                disabled={pending}
                                onClick={() =>
                                  run(() => setAccountActive(account.id, !account.active), {
                                    success: account.active
                                      ? "Account archived."
                                      : "Account restored.",
                                    onSuccess: () => router.refresh(),
                                  })
                                }
                              >
                                {account.active ? (
                                  <Archive aria-hidden="true" />
                                ) : (
                                  <ArchiveRestore aria-hidden="true" />
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={draft !== null} onOpenChange={(next) => !next && !pending && setDraft(null)}>
        <DialogContent>
          {draft && (
            <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
              <DialogHeader>
                <DialogTitle>{draft.id ? "Edit account" : "Add an account"}</DialogTitle>
                <DialogDescription>
                  The code groups accounts: 1xxx assets, 2xxx liabilities, 3xxx equity, 4xxx
                  revenue, 5xxx to 9xxx expenses.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                  <Field id="account-code" label="Code" required error={errors.code}>
                    <Input
                      id="account-code"
                      inputMode="numeric"
                      value={draft.code}
                      maxLength={6}
                      onChange={(event) => setDraft({ ...draft, code: event.target.value })}
                      aria-invalid={!!errors.code}
                      placeholder="6700"
                    />
                  </Field>
                  <Field id="account-name" label="Name" required error={errors.name}>
                    <Input
                      id="account-name"
                      value={draft.name}
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                      aria-invalid={!!errors.name}
                      autoComplete="off"
                    />
                  </Field>
                </div>
                <Field
                  id="account-type"
                  label="Type"
                  error={errors.type}
                  hint={
                    draft.locked ? "Fixed: it has postings, or the system posts to it." : undefined
                  }
                >
                  <Select
                    value={draft.type}
                    disabled={draft.locked}
                    onValueChange={(next) => setDraft({ ...draft, type: next as AccountType })}
                  >
                    <SelectTrigger id="account-type" className="w-full">
                      <SelectValue>{(value: AccountType) => ACCOUNT_TYPE_LABEL[value]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {ACCOUNT_TYPE_LABEL[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="account-description" label="Description">
                  <Textarea
                    id="account-description"
                    rows={2}
                    value={draft.description}
                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
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
                <Button
                  type="submit"
                  disabled={pending || !draft.code.trim() || !draft.name.trim()}
                >
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
