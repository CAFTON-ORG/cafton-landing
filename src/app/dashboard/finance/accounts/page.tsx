import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { AccountsView } from "@/features/finance/components/accounts-view";
import { listAccounts } from "@/features/finance/repository";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Chart of accounts" };

export default async function AccountsPage() {
  const staff = await requirePageAccess("finance:view");
  if (!staff) return <AccessDenied area="the books" />;

  return (
    <>
      <PageHeader
        title="Chart of accounts"
        description="Every place money can sit or come from. Balances come from the journal; accounts the system posts to are marked and can't be archived."
      />
      <AccountsView accounts={await listAccounts({ includeArchived: true })} />
    </>
  );
}
