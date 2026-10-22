"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, Plus } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
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
import { createContract } from "../actions/contracts";
import { needsQuote } from "../merge";
import { CONTRACT_KIND_LABEL } from "../rules";
import type { ContractRow, QuoteChoice, TemplateView } from "../types";
import { ContractStatusBadge } from "./contract-status-badge";

/** The contracts and statements of work of one deal, with a button to draft another from a template. */
export function DealContractsPanel({
  dealId,
  contracts,
  templates,
  quotes,
  closedLost,
}: {
  dealId: string;
  contracts: ContractRow[];
  templates: TemplateView[];
  quotes: QuoteChoice[];
  closedLost: boolean;
}) {
  const canCreate = useCan("contracts:create");
  const [open, setOpen] = useState(false);

  const start = (
    <Button
      disabled={closedLost || templates.length === 0}
      title={
        closedLost
          ? "Reopen the deal to draft a contract"
          : templates.length === 0
            ? "Add a template first (Sales, Contracts, Templates)"
            : undefined
      }
      onClick={() => setOpen(true)}
    >
      <Plus aria-hidden="true" /> New contract
    </Button>
  );

  return (
    <Card>
      <CardContent className="grid gap-3">
        {contracts.length === 0 ? (
          <EmptyState
            compact
            icon={FileText}
            title="No contracts yet"
            description={
              quotes.length === 0
                ? "Once the client accepts a quote, draft the agreement here and have them sign it online."
                : "Draft the agreement or statement of work from a template and have the client sign it online."
            }
            action={canCreate ? start : undefined}
          />
        ) : (
          <>
            {canCreate && <div>{start}</div>}
            <ul className="divide-y">
              {contracts.map((contract) => (
                <li
                  key={contract.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/sales/contracts/${contract.id}`}
                      className="text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {contract.reference}
                    </Link>
                    <p className="text-muted-foreground truncate text-xs">
                      {CONTRACT_KIND_LABEL[contract.kind]} · drafted{" "}
                      {formatDate(contract.createdAt)}
                    </p>
                  </div>
                  <ContractStatusBadge status={contract.status} />
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
      {open && (
        <NewContractDialog
          dealId={dealId}
          templates={templates}
          quotes={quotes}
          onClose={() => setOpen(false)}
        />
      )}
    </Card>
  );
}

function NewContractDialog({
  dealId,
  templates,
  quotes,
  onClose,
}: {
  dealId: string;
  templates: TemplateView[];
  quotes: QuoteChoice[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [quoteId, setQuoteId] = useState(quotes[0]?.id ?? "none");
  const template = templates.find((entry) => entry.id === templateId);
  const chosenQuote = quotes.find((entry) => entry.id === quoteId);
  const quoteRequired = !!template && (template.kind === "sow" || needsQuote(template.body));

  return (
    <Dialog open onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => createContract(dealId, templateId, quoteId === "none" ? undefined : quoteId),
              {
                success: "Contract drafted.",
                onSuccess: (data) => data && router.push(`/dashboard/sales/contracts/${data.id}`),
              },
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>New contract</DialogTitle>
            <DialogDescription>
              The template&apos;s merge fields are filled in from this deal. You can edit the
              wording before sending.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <Field id="contract-template" label="Template" required>
              <Select value={templateId} onValueChange={(value) => value && setTemplateId(value)}>
                <SelectTrigger id="contract-template" className="w-full">
                  <SelectValue placeholder="Pick a template">
                    {template ? `${template.name} (${CONTRACT_KIND_LABEL[template.kind]})` : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {templates.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.name} ({CONTRACT_KIND_LABEL[entry.kind]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="contract-quote"
              label="Accepted quote"
              required={quoteRequired}
              hint={
                quotes.length === 0
                  ? "No quote on this deal has been accepted yet."
                  : quoteRequired
                    ? "The price, deposit and scope come from this quote."
                    : "Optional. Link the agreement to the price the client accepted."
              }
            >
              <Select value={quoteId} onValueChange={(value) => value && setQuoteId(value)}>
                <SelectTrigger id="contract-quote" className="w-full">
                  <SelectValue placeholder="None">
                    {chosenQuote
                      ? `${chosenQuote.reference} v${chosenQuote.version} · ${formatMinor(chosenQuote.totalMinor, "PHP")}`
                      : "None"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {!quoteRequired && <SelectItem value="none">None</SelectItem>}
                  {quotes.map((quote) => (
                    <SelectItem key={quote.id} value={quote.id}>
                      {quote.reference} v{quote.version} · {formatMinor(quote.totalMinor, "PHP")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="submit" disabled={pending || !templateId}>
              {pending ? "Drafting…" : "Draft it"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
