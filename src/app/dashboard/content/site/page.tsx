import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { SiteSettingsEditor } from "@/features/cms/components/site-settings-editor";
import { getSiteSettings } from "@/features/cms/repository/site";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Website settings" };

export default async function SiteSettingsPage() {
  const staff = await requirePageAccess("settings:view");
  if (!staff) return <AccessDenied area="the website settings" />;

  return (
    <>
      <PageHeader
        title="Website settings"
        description="Company facts, contact details and social links shown across the website."
      />
      <SiteSettingsEditor settings={await getSiteSettings()} />
    </>
  );
}
