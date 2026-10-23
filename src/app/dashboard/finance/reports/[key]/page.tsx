import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { ReportControls } from "@/features/finance/components/report-controls";
import { ReportView } from "@/features/finance/components/report-view";
import { asOfPresets, periodPresets } from "@/features/finance/report-presets";
import { getReport, readParams } from "@/features/finance/report-repository";
import { REPORT_KEYS, REPORT_META, type ReportKey } from "@/features/finance/reports";
import { manilaDate } from "@/features/schedule/slots";
import { requirePageAccess } from "@/lib/auth/dal";
import { searchParamsFromRecord } from "@/lib/table-params";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const meta = REPORT_META[key as ReportKey];
  return { title: meta?.title ?? "Report" };
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("finance:view");
  if (!staff) return <AccessDenied area="the reports" />;

  const { key } = await params;
  if (!(REPORT_KEYS as readonly string[]).includes(key)) notFound();
  const reportKey = key as ReportKey;
  const meta = REPORT_META[reportKey];

  const query = searchParamsFromRecord(await searchParams);
  const dates = readParams({
    from: query.get("from") ?? undefined,
    to: query.get("to") ?? undefined,
    asOf: query.get("asOf") ?? undefined,
  });
  const spec = await getReport(reportKey, dates);
  const today = manilaDate(new Date());

  return (
    <>
      <BackLink href="/dashboard/finance/reports">Reports</BackLink>
      <PageHeader title={meta.title} description={spec ? spec.subtitle : meta.blurb} />
      <ReportControls
        reportKey={reportKey}
        dated={meta.dated}
        from={dates.from}
        to={dates.to}
        asOf={dates.asOf}
        presets={meta.dated === "period" ? periodPresets(today) : asOfPresets(today)}
      />
      {spec && <ReportView spec={spec} />}
    </>
  );
}
