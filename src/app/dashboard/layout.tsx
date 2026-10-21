import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppBar } from "@/components/dashboard/layout/app-bar";
import { Sidebar } from "@/components/dashboard/layout/sidebar";
import { SidebarProvider } from "@/components/dashboard/layout/sidebar-context";
import { StaffProvider } from "@/components/dashboard/layout/staff-context";
import { verifySession } from "@/lib/auth/dal";
import { DashboardProviders } from "@/components/dashboard/providers";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s - Cafton Dashboard" },
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // The proxy only does an optimistic redirect. This is the real check.
  const staff = await verifySession();

  return (
    <DashboardProviders>
      <StaffProvider
        staff={{
          name: staff.name,
          email: staff.email,
          roleKey: staff.roleKey,
          roleName: staff.roleName,
          avatarUrl: staff.avatarUrl,
          permissions: staff.permissions,
        }}
      >
        <SidebarProvider>
          <div className="flex min-h-svh">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <AppBar />
              <main
                id="main"
                tabIndex={-1}
                className="mx-auto w-full max-w-7xl flex-1 p-4 outline-none sm:p-6"
              >
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </StaffProvider>
    </DashboardProviders>
  );
}
