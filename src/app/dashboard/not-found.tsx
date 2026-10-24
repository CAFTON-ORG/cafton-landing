import Link from "next/link";
import { SearchX } from "lucide-react";

import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Button } from "@/components/dashboard/ui/button";

export default function DashboardNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="We couldn't find that"
      description="It may have been deleted, or the link is wrong."
      action={
        <Button render={<Link href="/dashboard" />} nativeButton={false}>
          Back to the overview
        </Button>
      }
      className="py-24"
    />
  );
}
