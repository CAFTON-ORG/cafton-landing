import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleCheck, CircleX, Clock, Download } from "lucide-react";

import { SITE_NAME } from "@/config/site";
import { RespondPanel } from "@/components/marketing/quote/respond-panel";
import { Logo } from "@/components/shared/logo";
import { contractBlocks } from "@/features/contracts/rules/format";
import { markContractViewed, respondToContract } from "@/features/contracts/actions/public";
import { getPublicContract } from "@/features/contracts/repository/contracts";
import { CONTRACT_KIND_LABEL } from "@/features/contracts/rules/core";

// A private link: never indexed, never cached.
export const metadata: Metadata = {
  title: "Your agreement",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const day = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "UTC" }).format(
        new Date(`${value.slice(0, 10)}T00:00:00Z`),
      )
    : "";

export default async function PublicContractPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const contract = await getPublicContract(token);
  if (!contract) notFound();
  await markContractViewed(token);

  const open = contract.status === "sent";
  const kind = CONTRACT_KIND_LABEL[contract.kind];
  const banner =
    contract.status === "accepted"
      ? {
          icon: CircleCheck,
          tone: "border-emerald-500/40 bg-emerald-500/10",
          text: `Signed by ${contract.acceptedByName}${contract.acceptedAt ? ` on ${day(contract.acceptedAt)}` : ""}. Thank you!`,
        }
      : contract.status === "declined"
        ? {
            icon: CircleX,
            tone: "bg-muted",
            text: "You declined this agreement. If that was a mistake, reply to our email and we will help.",
          }
        : contract.status === "expired"
          ? {
              icon: Clock,
              tone: "border-amber-500/40 bg-amber-500/10",
              text: "The sign-by date has passed. Reply to our email and we will send you a fresh one.",
            }
          : contract.status === "withdrawn"
            ? {
                icon: Clock,
                tone: "bg-muted",
                text: "This agreement was withdrawn and can no longer be signed. Reply to our email if you have any questions.",
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
                {kind} {contract.reference}
              </p>
            </div>
          </div>
          <a
            href={`/api/contracts/${token}/pdf`}
            className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
          >
            <Download className="size-4" aria-hidden="true" /> Download the PDF
          </a>
        </header>

        <section className="grid gap-1">
          <h1 className="text-2xl font-semibold">{contract.title}</h1>
          <p className="text-muted-foreground text-sm">
            Prepared for {contract.recipientName}
            {contract.validUntil && ` · please sign by ${day(contract.validUntil)}`}
          </p>
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

        <article
          aria-label={kind}
          className="bg-card grid gap-3 rounded-xl border p-5 text-sm leading-relaxed sm:p-8"
        >
          {contractBlocks(contract.body).map((block, index) =>
            block.kind === "heading" ? (
              <h2 key={index} className="mt-3 text-base font-semibold first:mt-0">
                {block.text}
              </h2>
            ) : (
              <p key={index} className="whitespace-pre-wrap">
                {block.text}
              </p>
            ),
          )}
        </article>

        {open && (
          <RespondPanel
            token={token}
            noun="contract"
            recipientName={contract.recipientName}
            respond={respondToContract as never}
            agreement={`I have read ${contract.reference} (${contract.title}) and I agree to it.`}
          />
        )}
      </div>
    </main>
  );
}
