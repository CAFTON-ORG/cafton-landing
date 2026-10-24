"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { SegmentedNav } from "@/components/dashboard/shared/segmented-nav";

export interface StatusTab {
  /** The value in the link; empty for "All". */
  value: string;
  label: string;
  count?: number;
}

/**
 * The status tabs above a finance list (All, Draft, Awaiting payment, Overdue, Paid): real links
 * that keep the list's other settings, so the view can be shared and Back works. The tab that is
 * on is the one whose value is in the link. Same look as every other tab in the dashboard.
 */
export function StatusTabs({
  param,
  tabs,
  label,
}: {
  param: string;
  tabs: StatusTab[];
  label: string;
}) {
  const path = usePathname();
  const search = useSearchParams();
  const current = search.get(param) ?? "";

  const href = (value: string) => {
    const next = new URLSearchParams(search.toString());
    if (value) next.set(param, value);
    else next.delete(param);
    next.delete("page");
    const text = next.toString();
    return text ? `${path}?${text}` : path;
  };

  return (
    <div className="mb-3">
      <SegmentedNav
        label={label}
        items={tabs.map((tab) => ({
          href: href(tab.value),
          label: tab.label,
          count: tab.count,
          active: tab.value === current,
        }))}
      />
    </div>
  );
}
