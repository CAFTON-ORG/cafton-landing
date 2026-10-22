import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleCheck, CircleX, Clock, Download } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { SITE_NAME } from "@/config/site";
import { RespondPanel } from "@/components/marketing/quote/respond-panel";
import { quantityText } from "@/features/sales/pricing";
import { markQuoteViewed } from "@/features/sales/public";
import { getPublicQuote } from "@/features/sales/repository";
import { formatMinor } from "@/lib/money";

// A private link: never indexed, never cached.
export const metadata: Metadata = {
  title: "Your quote",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const day = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "UTC" }).format(
        new Date(`${value}T00:00:00Z`),
      )
    : "";

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await getPublicQuote(token);
  if (!quote) notFound();
  await markQuoteViewed(token);

  const open = quote.status === "sent";
  const deposit = Math.round((quote.totalMinor * quote.depositPct) / 100);
  const banner =
    quote.status === "accepted"
      ? {
          icon: CircleCheck,
          tone: "border-emerald-500/40 bg-emerald-500/10",
          text: `Accepted by ${quote.acceptedByName}${quote.acceptedAt ? ` on ${day(quote.acceptedAt.slice(0, 10))}` : ""}. Thank you!`,
        }
      : quote.status === "declined"
        ? {
            icon: CircleX,
            tone: "bg-muted",
            text: "You declined this quote. If that was a mistake, reply to our email and we will help.",
          }
        : quote.status === "expired"
          ? {
              icon: Clock,
              tone: "border-amber-500/40 bg-amber-500/10",
              text: "This quote has expired. Reply to our email and we will send you a fresh one.",
            }
          : quote.status === "withdrawn"
            ? {
                icon: Clock,
                tone: "bg-muted",
                text: "This quote was withdrawn and can no longer be accepted. Reply to our email if you have any questions.",
              }
            : quote.status === "superseded"
              ? {
                  icon: Clock,
                  tone: "border-amber-500/40 bg-amber-500/10",
                  text: "A newer version of this quote replaced this one. Please use the latest email we sent you.",
                }
              : null;

  return (
    <main className="bg-background text-foreground min-h-svh px-4 py-10 sm:px-6">
      <div className="mx-auto grid max-w-3xl gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size={36} aria-hidden="true" />
            <div>
              <p className="text-xl font-semibold tracking-wide">{SITE_NAME}</p>
              <p className="text-muted-foreground text-sm">
                Quote {quote.reference}
                {quote.version > 1 ? ` · version ${quote.version}` : ""}
              </p>
            </div>
          </div>
          <a
            href={`/api/quotes/${token}/pdf`}
            className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
          >
            <Download className="size-4" aria-hidden="true" /> Download the PDF
          </a>
        </header>

        <section className="grid gap-1">
          <h1 className="text-2xl font-semibold">{quote.title}</h1>
          <p className="text-muted-foreground text-sm">
            Prepared for {quote.recipientName}
            {quote.validUntil && ` · valid until ${day(quote.validUntil)}`}
          </p>
          {quote.intro && <p className="mt-2 whitespace-pre-wrap">{quote.intro}</p>}
        </section>

        {banner && (
          <p
            role="status"
            className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${banner.tone}`}
          >
            <banner.icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {banner.text}
          </p>
        )}

        <section
          aria-label="What is included"
          className="bg-card overflow-hidden rounded-xl border"
        >
          <ul className="divide-y">
            {quote.lines.map((line, index) => (
              <li
                key={index}
                className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1fr_auto] sm:gap-6"
              >
                <span className="whitespace-pre-wrap">{line.description}</span>
                <span className="text-muted-foreground tabular-nums sm:text-right">
                  {quantityText(line.quantityMilli)} {line.unitLabel} ×{" "}
                  {formatMinor(line.unitPriceMinor, quote.currency)}
                  {line.discountPct > 0 && ` − ${line.discountPct}%`}
                  <span className="text-foreground block font-medium">
                    {formatMinor(line.totalMinor, quote.currency)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <dl className="grid gap-1 border-t px-4 py-3 text-sm sm:ml-auto sm:max-w-xs">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatMinor(quote.subtotalMinor, quote.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>VAT ({quote.taxRatePct}%)</dt>
              <dd className="tabular-nums">{formatMinor(quote.taxMinor, quote.currency)}</dd>
            </div>
            <div className="flex justify-between border-t pt-1 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMinor(quote.totalMinor, quote.currency)}</dd>
            </div>
            {quote.depositPct > 0 && quote.depositPct < 100 && (
              <>
                <div className="text-muted-foreground flex justify-between pt-1">
                  <dt>Deposit on acceptance ({quote.depositPct}%)</dt>
                  <dd className="tabular-nums">{formatMinor(deposit, quote.currency)}</dd>
                </div>
                <div className="text-muted-foreground flex justify-between">
                  <dt>Balance on completion</dt>
                  <dd className="tabular-nums">
                    {formatMinor(quote.totalMinor - deposit, quote.currency)}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </section>

        {quote.paymentTerms && (
          <section aria-labelledby="payment-terms" className="grid gap-1">
            <h2 id="payment-terms" className="font-semibold">
              Payment terms
            </h2>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
              {quote.paymentTerms}
            </p>
          </section>
        )}

        {quote.terms && (
          <section aria-labelledby="terms" className="grid gap-1">
            <h2 id="terms" className="font-semibold">
              Terms
            </h2>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">{quote.terms}</p>
          </section>
        )}

        {open && (
          <RespondPanel
            token={token}
            recipientName={quote.recipientName}
            agreement={`I accept quote ${quote.reference} for ${formatMinor(quote.totalMinor, quote.currency)}, and I agree to its terms.`}
          />
        )}
      </div>
    </main>
  );
}
