"use client";

import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { Button } from "@/components/dashboard/ui/button";

/** Downloads the list as CSV with the same search and filters as on screen. */
export function ExportButton({ kind }: { kind: "leads" | "contacts" | "organizations" | "deals" }) {
  const allowed = useCan(kind === "organizations" ? "organizations:update" : `${kind}:update`);
  const params = useSearchParams();
  if (!allowed) return null;
  const query = new URLSearchParams(params);
  query.delete("page");
  query.delete("view");
  const text = query.toString();
  return (
    <Button
      variant="outline"
      nativeButton={false}
      render={<a href={`/api/crm/export/${kind}${text ? `?${text}` : ""}`} download />}
    >
      <Download aria-hidden="true" /> Export CSV
    </Button>
  );
}
