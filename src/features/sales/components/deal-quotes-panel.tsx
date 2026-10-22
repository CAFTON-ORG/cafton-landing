"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSignature, Plus } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import { createQuote } from "../actions/quotes";
import type { QuoteRow } from "../types";
import { QuoteStatusBadge } from "./quote-status-badge";

/** The quotes made for one deal, newest first, with a button to start another. */
export function DealQuotesPanel({
  dealId,
  quotes,
  closedLost,
}: {
  dealId: string;
  quotes: QuoteRow[];
  closedLost: boolean;
}) {
  const router = useRouter();
  const canCreate = useCan("quotes:create");
  const { run, pending } = useServerAction();

  const start = (
    <Button
      disabled={pending || closedLost}
      title={closedLost ? "Reopen the deal to make a quote" : undefined}
      onClick={() =>
        run(() => createQuote(dealId), {
          success: "Quote started.",
          onSuccess: (data) => data && router.push(`/dashboard/sales/quotes/${data.id}`),
        })
      }
    >
      <Plus aria-hidden="true" /> New quote
    </Button>
  );

  return (
    <Card>
      <CardContent className="grid gap-3">
        {quotes.length === 0 ? (
          <EmptyState
            compact
            icon={FileSignature}
            title="No quotes yet"
            description="Price the work, send it to the client and let them accept it online."
            action={canCreate ? start : undefined}
          />
        ) : (
          <>
            {canCreate && <div>{start}</div>}
            <ul className="divide-y">
              {quotes.map((quote) => (
                <li
                  key={quote.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/sales/quotes/${quote.id}`}
                      className="text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {quote.reference}
                      {quote.version > 1 && (
                        <span className="text-muted-foreground"> v{quote.version}</span>
                      )}
                    </Link>
                    <p className="text-muted-foreground truncate text-xs">
                      {quote.title} · made {formatDate(quote.createdAt)}
                    </p>
                  </div>
                  <span className="flex items-center gap-3 text-sm">
                    <QuoteStatusBadge status={quote.status} />
                    <span className="tabular-nums">
                      {formatMinor(quote.totalMinor, quote.currency)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
