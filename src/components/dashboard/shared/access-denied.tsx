import { LockKeyhole } from "lucide-react";

import { EmptyState } from "./empty-state";

/** Shown by a page when the signed-in person is staff but may not open it. */
export function AccessDenied({ area }: { area: string }) {
  return (
    <EmptyState
      icon={LockKeyhole}
      title="You don't have access to this page"
      description={`Your role doesn't include ${area}. Ask an owner or admin if you need it.`}
      className="py-24"
    />
  );
}
