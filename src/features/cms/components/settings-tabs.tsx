"use client";

import { usePathname } from "next/navigation";

import { SegmentedNav } from "@/components/dashboard/shared/segmented-nav";

/** Tabs that are real links (so each has its own address and Back works). */
export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-4">
      <SegmentedNav
        label="Website settings sections"
        items={[
          {
            href: "/dashboard/content/site",
            label: "General",
            active: pathname === "/dashboard/content/site",
          },
          {
            href: "/dashboard/content/site/seo",
            label: "Search and sharing",
            active: pathname.startsWith("/dashboard/content/site/seo"),
          },
        ]}
      />
    </div>
  );
}
