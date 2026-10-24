import type { ReactNode } from "react";

import { DashboardProviders } from "@/components/dashboard/providers";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <DashboardProviders>{children}</DashboardProviders>;
}
