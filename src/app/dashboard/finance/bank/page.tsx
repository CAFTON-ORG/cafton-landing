import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { BankAccountsView } from "@/features/finance/components/bank-accounts-view";
import { listBankAccounts } from "@/features/finance/bank-repository";
import { listPostableAccounts } from "@/features/finance/repository";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Bank" };

export default async function BankPage() {
  const staff = await requirePageAccess("bank:view");
  if (!staff) return <AccessDenied area="the bank" />;

  const [accounts, ledger] = await Promise.all([listBankAccounts(), listPostableAccounts()]);
  return (
    <>
      <PageHeader
        title="Bank"
        description="Your bank and e-wallet accounts. Import each statement and check every line against the books; what the books are missing gets booked from here."
      />
      <BankAccountsView
        accounts={accounts}
        assetAccounts={ledger.filter((account) => account.type === "asset")}
      />
    </>
  );
}
