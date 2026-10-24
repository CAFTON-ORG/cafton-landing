import type { ReactNode } from "react";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import { SettingsTabs } from "@/features/cms/components/settings-tabs";

/** Website settings: one page with two tabs, so related settings sit together. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader
        title="Website settings"
        description="Company facts, contact details, social links, and what search engines and social networks show."
      />
      <SettingsTabs />
      {children}
    </>
  );
}
