import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { FinanceSettingsView } from "@/features/finance/components/finance-settings-view";
import {
  getFinanceSettings,
  listBillingRates,
  listRateChoices,
} from "@/features/finance/repository/settings";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Finance settings" };

export default async function FinanceSettingsPage() {
  const staff = await requirePageAccess("finance:view");
  if (!staff) return <AccessDenied area="the finance settings" />;

  const [settings, rates, choices] = await Promise.all([
    getFinanceSettings(),
    listBillingRates(),
    listRateChoices(),
  ]);
  return (
    <>
      <PageHeader
        title="Finance settings"
        description="How tax, payment terms and hourly rates start out. Quotes and invoices already made keep what they were made with."
      />
      <FinanceSettingsView settings={settings} rates={rates} choices={choices} />
    </>
  );
}
