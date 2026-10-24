import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { CatalogView } from "@/features/sales/components/catalog-view";
import { listCatalog } from "@/features/sales/repository/sales";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Catalog" };

export default async function CatalogPage() {
  const staff = await requirePageAccess("catalog:view");
  if (!staff) return <AccessDenied area="the catalog" />;

  return (
    <>
      <PageHeader
        title="Catalog"
        description="What Cafton sells, with a price and how it is charged. Quotes pick from this list."
      />
      <CatalogView items={await listCatalog()} />
    </>
  );
}
