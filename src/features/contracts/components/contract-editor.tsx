"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Ban, Copy, Download, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
import { Field } from "@/components/dashboard/shared/field";
import { FormActions } from "@/components/dashboard/shared/form-action-bar";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import { Input } from "@/components/dashboard/ui/input";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import {
  deleteContract,
  renewContractLink,
  saveContract,
  sendContract,
  withdrawContract,
} from "../actions/contracts";
import { contractBlocks } from "../format";
import { CONTRACT_KIND_LABEL, canEdit } from "../rules";
import type { ContractView } from "../types";
import { ContractStatusBadge } from "./contract-status-badge";

/**
 * The contract editor. A draft's wording is edited here; every other status shows the same page
 * read-only, with the next step in the rail: send, copy a new link, withdraw, download the PDF.
 */
export function ContractEditor({ contract }: { contract: ContractView }) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const canUpdate = useCan("contracts:update");
  const canSend = useCan("contracts:send");
  const canDelete = useCan("contracts:delete");

  const editable = canEdit(contract.status) && canUpdate;
  const initial = useMemo(
    () => ({
      title: contract.title,
      body: contract.body,
      validUntil: contract.validUntil ?? "",
    }),
    [contract],
  );
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const dirty = editable && JSON.stringify(values) !== JSON.stringify(initial);
  const kind = CONTRACT_KIND_LABEL[contract.kind];

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function save() {
    setErrors({});
    run(() => saveContract(contract.id, values), {
      success: "Saved.",
      onSuccess: () => router.refresh(),
      onFieldErrors: setErrors,
    });
  }

  const status = contract.status;
  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (editable) save();
        }}
        noValidate
      >
        <EditorLayout
          rail={
            <>
              {editable ? (
                <FormActions
                  title={kind}
                  badge={<ContractStatusBadge status={status} />}
                  dirty={dirty}
                  pending={pending}
                  onDiscard={() => {
                    setValues(initial);
                    setErrors({});
                  }}
                  error={Object.keys(errors).length ? "Check the highlighted fields." : undefined}
                  secondary={
                    canSend ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={pending || dirty}
                        title={dirty ? "Save your changes first" : undefined}
                        onClick={() => setSending(true)}
                      >
                        <Send aria-hidden="true" /> Send to {contract.contactName}
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {kind} <ContractStatusBadge status={status} />
                    </CardTitle>
                    <CardDescription>
                      {status === "sent"
                        ? "Waiting for the client's signature."
                        : status === "accepted"
                          ? "Signed. This is now an agreement and can't be changed."
                          : status === "declined"
                            ? "The client declined it."
                            : status === "expired"
                              ? "The sign-by date passed. Draft a new one to offer again."
                              : "Withdrawn. Draft a new one to offer again."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2 [&>*]:w-full">
                    {status === "sent" && canSend && (
                      <Button type="button" disabled={pending} onClick={() => setSending(true)}>
                        <Send aria-hidden="true" /> Send again
                      </Button>
                    )}
                    {status === "sent" && canUpdate && (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => setWithdrawing(true)}
                      >
                        <Ban aria-hidden="true" /> Withdraw this contract
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Share</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 [&>*]:w-full">
                  <Button
                    type="button"
                    variant="outline"
                    nativeButton={false}
                    render={<a href={`/api/crm/contracts/${contract.id}/pdf`} download />}
                  >
                    <Download aria-hidden="true" /> Download the PDF
                  </Button>
                  {status === "sent" && canSend && <NewLink contractId={contract.id} />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>History</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="grid gap-2 text-sm">
                    <li>
                      Drafted {formatDate(contract.createdAt)}
                      {contract.createdByName && ` by ${contract.createdByName}`}
                      {contract.templateName && ` from ${contract.templateName}`}
                    </li>
                    {contract.sentAt && (
                      <li>
                        Sent to {contract.sentTo} on{" "}
                        {formatDate(contract.sentAt, { dateStyle: "medium", timeStyle: "short" })}
                      </li>
                    )}
                    {contract.viewedAt && (
                      <li>
                        Opened by the client{" "}
                        {formatDate(contract.viewedAt, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </li>
                    )}
                    {contract.acceptedAt && (
                      <li className="font-medium text-emerald-800 dark:text-emerald-300">
                        Signed by {contract.acceptedByName} on{" "}
                        {formatDate(contract.acceptedAt, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </li>
                    )}
                    {contract.declinedAt && (
                      <li>
                        Declined {formatDate(contract.declinedAt)}: {contract.declinedReason}
                      </li>
                    )}
                    {contract.withdrawnAt && (
                      <li>
                        Withdrawn {formatDate(contract.withdrawnAt)}: {contract.withdrawnReason}
                      </li>
                    )}
                  </ol>
                </CardContent>
              </Card>

              {canDelete && status === "draft" && !contract.hasLink && (
                <Button type="button" variant="ghost" onClick={() => setDeleting(true)}>
                  <Trash2 aria-hidden="true" /> Delete this draft
                </Button>
              )}
            </>
          }
        >
          <p className="text-muted-foreground text-sm">
            For{" "}
            <Link
              href={`/dashboard/crm/deals/${contract.dealId}`}
              className="underline underline-offset-4"
            >
              {contract.dealTitle}
            </Link>{" "}
            · {contract.contactName}
            {contract.contactEmail ? ` <${contract.contactEmail}>` : " (no email address)"}
            {contract.quoteReference && ` · quote ${contract.quoteReference}`}
          </p>

          {editable ? (
            <Card>
              <CardHeader>
                <CardTitle>Wording</CardTitle>
                <CardDescription>
                  Plain text. Leave a blank line between paragraphs; a short line on its own, like
                  &ldquo;1. Scope&rdquo;, becomes a heading. Once sent, it can&apos;t be edited.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Field id="contract-title" label="Title" required error={errors.title}>
                  <Input
                    id="contract-title"
                    value={values.title}
                    aria-invalid={!!errors.title}
                    onChange={(event) => setValues({ ...values, title: event.target.value })}
                  />
                </Field>
                <Field
                  id="contract-valid"
                  label="Sign by"
                  hint="The client can't sign after this date."
                  error={errors.validUntil}
                >
                  <DatePicker
                    id="contract-valid"
                    value={values.validUntil}
                    onChange={(value) => setValues({ ...values, validUntil: value })}
                  />
                </Field>
                <Field id="contract-body" label="Wording" required error={errors.body}>
                  <Textarea
                    id="contract-body"
                    rows={24}
                    className="font-mono text-sm"
                    value={values.body}
                    aria-invalid={!!errors.body}
                    onChange={(event) => setValues({ ...values, body: event.target.value })}
                  />
                </Field>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{contract.title}</CardTitle>
                <CardDescription>
                  {contract.validUntil
                    ? `Sign by ${formatDate(contract.validUntil)}`
                    : "No sign-by date"}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm leading-relaxed">
                {contractBlocks(contract.body).map((block, index) =>
                  block.kind === "heading" ? (
                    <h3 key={index} className="mt-2 font-semibold">
                      {block.text}
                    </h3>
                  ) : (
                    <p key={index} className="whitespace-pre-wrap">
                      {block.text}
                    </p>
                  ),
                )}
              </CardContent>
            </Card>
          )}
        </EditorLayout>
      </form>

      <Dialog open={withdrawing} onOpenChange={(open) => !pending && setWithdrawing(open)}>
        <DialogContent>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => withdrawContract(contract.id, withdrawReason), {
                success: "Withdrawn.",
                onSuccess: () => {
                  setWithdrawing(false);
                  setWithdrawReason("");
                  router.refresh();
                },
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Withdraw this contract?</DialogTitle>
              <DialogDescription>
                The client can no longer sign it, and their link says it was withdrawn. This
                can&apos;t be undone; draft a new one if you want to offer again.
              </DialogDescription>
            </DialogHeader>
            <Field id="withdraw-reason" label="Why?" required>
              <Textarea
                id="withdraw-reason"
                rows={3}
                value={withdrawReason}
                onChange={(event) => setWithdrawReason(event.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setWithdrawing(false)}
                disabled={pending}
              >
                Keep it
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={pending || !withdrawReason.trim()}
              >
                Withdraw
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={sending}
        onOpenChange={setSending}
        title={`Send ${contract.reference} to ${contract.contactName}?`}
        description={`It is emailed to ${contract.contactEmail ?? "the contact"} with the PDF and a link to read and sign it. Once sent, the wording is fixed.`}
        confirmLabel={`Send the ${kind.toLowerCase()}`}
        pending={pending}
        onConfirm={() =>
          run(() => sendContract(contract.id), {
            success: (data) =>
              data?.emailed
                ? "Sent."
                : "Marked as sent, but the email could not be sent. Copy a new link and send it yourself.",
            onSuccess: () => {
              setSending(false);
              router.refresh();
            },
          })
        }
      />

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this draft?"
        description="It was never sent, so nothing is lost but the draft."
        confirmLabel="Delete"
        destructive
        pending={pending}
        onConfirm={() =>
          run(() => deleteContract(contract.id), {
            success: "Deleted.",
            onSuccess: () => router.push(`/dashboard/crm/deals/${contract.dealId}`),
          })
        }
      />
    </>
  );
}

/** Only a hash of the client's link is kept, so this makes a new one, copies it, and kills the old one. */
function NewLink({ contractId }: { contractId: string }) {
  const { run, pending } = useServerAction();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      title="Makes a new link and copies it. The old link stops working."
      onClick={() =>
        run(() => renewContractLink(contractId), {
          onSuccess: (data) => {
            if (data?.link)
              void navigator.clipboard
                .writeText(data.link)
                .then(() => toast.success("New link copied. The old one no longer works."));
          },
        })
      }
    >
      <Copy aria-hidden="true" /> Copy a new client link
    </Button>
  );
}
