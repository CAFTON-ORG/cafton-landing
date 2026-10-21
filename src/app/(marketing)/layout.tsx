import type { ReactNode } from "react";

import { SiteChrome } from "@/components/marketing/layout/site-chrome";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
