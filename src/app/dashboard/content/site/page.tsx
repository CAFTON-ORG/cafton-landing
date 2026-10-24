import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { SiteSettingsEditor } from "@/features/cms/components/site-settings-editor";
import { getSiteSettings } from "@/features/cms/repository/site";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Website settings" };

export default async function SiteSettingsPage() {
  const staff = await requirePageAccess("settings:view");
  if (!staff) return <AccessDenied area="the website settings" />;

  return (
    <>
      <SiteSettingsEditor settings={await getSiteSettings()} />
    </>
  );
}
