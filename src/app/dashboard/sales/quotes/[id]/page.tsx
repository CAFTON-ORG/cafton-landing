import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { QuoteStatusBadge } from "@/features/sales/components/quote-status-badge";
import { getFinanceSettings } from "@/features/finance/repository/settings";
import { QuoteEditor } from "@/features/sales/components/quote-editor";
import { getQuote, listCatalog } from "@/features/sales/repository/sales";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Quote" };

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("quotes:view");
  if (!staff) return <AccessDenied area="quotes" />;

  const { id } = await params;
  const [quote, catalog] = await Promise.all([getQuote(id), listCatalog({ activeOnly: true })]);
  if (!quote) notFound();

  return (
    <>
      <BackLink href="/dashboard/sales/quotes">All quotes</BackLink>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {quote.reference}
            {quote.version > 1 && <span className="text-muted-foreground"> v{quote.version}</span>}
          </h1>
          <QuoteStatusBadge status={quote.status} />
        </div>
        <p className="text-muted-foreground text-sm">{quote.title}</p>
      </div>
      <QuoteEditor
        key={`${quote.id}-${quote.status}-${quote.totalMinor}`}
        quote={quote}
        catalog={catalog}
        vatRatePct={(await getFinanceSettings()).vatRatePct}
      />
    </>
  );
}
