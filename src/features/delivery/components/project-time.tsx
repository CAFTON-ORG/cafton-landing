import { Clock } from "lucide-react";

import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Person } from "@/components/dashboard/shared/person";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { formatDate } from "@/lib/format";
import { formatMinutes } from "../rules";
import type { TimeEntryView } from "../types";
import { TimeStatusBadge } from "./badges";

/** The latest hours logged on a project, with who logged them and where each stands. Read-only. */
export function ProjectTime({ entries }: { entries: TimeEntryView[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Time</CardTitle>
        <CardDescription>The latest hours logged on this project.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState
            compact
            icon={Clock}
            title="No hours yet"
            description="Hours the team logs on this project appear here."
          />
        ) : (
          <ul className="divide-y rounded-lg border">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <span className="text-muted-foreground w-24 shrink-0 text-xs">
                  {formatDate(entry.workDate)}
                </span>
                <Person name={entry.person.name} avatarUrl={entry.person.avatarUrl} />
                <div className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                  {entry.taskTitle}
                  {entry.taskTitle && entry.note && " · "}
                  {entry.note}
                </div>
                <span className="font-medium tabular-nums">{formatMinutes(entry.minutes)}</span>
                <TimeStatusBadge status={entry.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
