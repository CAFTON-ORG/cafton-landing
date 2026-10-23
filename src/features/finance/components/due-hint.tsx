import { cn } from "@/lib/utils";
import { dueHint, type Tone } from "../display";

const TONE: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  warning: "text-amber-700 dark:text-amber-400",
  danger: "text-red-700 dark:text-red-400",
  success: "text-emerald-700 dark:text-emerald-400",
};

/** "Due in 5 days" / "12 days overdue" under a due date, coloured by how pressing it is. */
export function DueHint({
  dueDate,
  today,
  owing,
  className,
}: {
  dueDate: string;
  today: string;
  /** Whether anything is still owed: nothing is said once it is paid. */
  owing: boolean;
  className?: string;
}) {
  const hint = dueHint(dueDate, today, owing);
  if (!hint) return null;
  return <span className={cn("text-xs", TONE[hint.tone], className)}>{hint.text}</span>;
}
