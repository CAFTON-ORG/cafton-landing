"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Permission } from "@/lib/auth/permissions";

/** What the browser needs to know about the signed-in person. Purely cosmetic: the server re-checks everything. */
export type StaffSummary = {
  name: string;
  email: string;
  roleKey: string;
  roleName: string;
  avatarUrl?: string;
  permissions: Permission[];
};

const StaffContext = createContext<StaffSummary | null>(null);

export function StaffProvider({ staff, children }: { staff: StaffSummary; children: ReactNode }) {
  return <StaffContext value={staff}>{children}</StaffContext>;
}

export function useStaff() {
  const staff = useContext(StaffContext);
  if (!staff) throw new Error("useStaff must be used inside <StaffProvider>.");
  return staff;
}

/** Hide a control the person may not use. The server still enforces it. */
export function useCan(permission: Permission) {
  return useStaff().permissions.includes(permission);
}
