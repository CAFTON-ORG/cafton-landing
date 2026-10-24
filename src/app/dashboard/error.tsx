"use client";

import { TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Button } from "@/components/dashboard/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="Something went wrong"
      description={
        error.digest ? `Please try again. Reference: ${error.digest}` : "Please try again."
      }
      action={<Button onClick={reset}>Try again</Button>}
      className="py-24"
    />
  );
}
