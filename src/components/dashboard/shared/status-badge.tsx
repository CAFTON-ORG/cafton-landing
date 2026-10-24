import { Badge } from "@/components/dashboard/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The one place status colours are defined, so "good" is the same green in
 * People, Leads, Deals and every later module. Same pairs as the template's
 * project status badge: a light tint behind darker text in light mode and
 * lighter text in dark mode, both above WCAG AA contrast.
 *
 * Colour is never the only signal: the badge always carries its text label.
 */
export const STATUS_TONES = {
  success: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-800 dark:text-amber-400",
  info: "bg-blue-500/10 text-blue-800 dark:text-blue-400",
  accent: "bg-violet-500/10 text-violet-800 dark:text-violet-400",
  danger: "bg-red-500/10 text-red-800 dark:text-red-300",
  neutral: "bg-muted text-foreground/70",
} as const;

export type StatusTone = keyof typeof STATUS_TONES;

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn("font-medium", STATUS_TONES[tone], className)}>
      {children}
    </Badge>
  );
}
