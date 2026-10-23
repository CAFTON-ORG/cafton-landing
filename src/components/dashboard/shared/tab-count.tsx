import { Badge } from "@/components/dashboard/ui/badge";

/**
 * The number after a tab or heading title, as a badge, when there is something to count.
 * One neutral tint for every tab (like GitHub's counters): it reads the same on the muted tab bar
 * and on the selected tab, in light and dark, and never competes with the status colours.
 */
export function TabCount({ n }: { n: number }) {
  return n > 0 ? (
    <Badge
      variant="secondary"
      className="bg-foreground/10 text-foreground/80 ml-1.5 h-4 min-w-4 px-1 tabular-nums"
    >
      {n}
    </Badge>
  ) : null;
}
