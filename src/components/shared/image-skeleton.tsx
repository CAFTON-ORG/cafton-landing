import { cn } from "@/lib/utils";

/** Pulsing placeholder shown behind a real image until it has actually decoded, so it fades in rather than popping in or leaving a blank gap. */
export function ImageSkeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("absolute inset-0 animate-pulse bg-muted/40", className)} />;
}
