"use client";

import Link from "next/link";
import { GitMerge } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { Button } from "@/components/dashboard/ui/button";

/** To the duplicate check, for people who may merge. */
export function MergeLink() {
  const leads = useCan("leads:merge");
  const contacts = useCan("contacts:merge");
  const organizations = useCan("organizations:merge");
  if (!leads && !contacts && !organizations) return null;
  return (
    <Button
      variant="outline"
      nativeButton={false}
      render={<Link href="/dashboard/crm/duplicates" />}
    >
      <GitMerge aria-hidden="true" /> Find duplicates
    </Button>
  );
}
