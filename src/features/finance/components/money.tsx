import { formatMinor } from "@/lib/money";
import { cn } from "@/lib/utils";
import { accountingText } from "../display";

/**
 * An amount the way every finance screen shows it: tabular figures, and a negative in parentheses
 * and red (the accounting convention) instead of with a minus sign. Put it in a right-aligned cell.
 */
export function Money({
  minor,
  bold = false,
  muteZero = false,
  className,
}: {
  minor: number;
  bold?: boolean;
  /** Show zero in a quieter colour, so an empty balance doesn't compete with a real one. */
  muteZero?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tabular-nums",
        minor < 0 && "text-red-700 dark:text-red-400",
        minor === 0 && muteZero && "text-muted-foreground",
        bold && "font-semibold",
        className,
      )}
    >
      {accountingText(formatMinor(Math.abs(minor)), minor)}
    </span>
  );
}
