import { cn } from "@/lib/utils";

interface RegistrationMarkProps {
  className?: string;
}

/**
 * A small "+" crosshair, the blueprint registration mark. Centred on its own
 * position, so place it with `left`/`top` classes at the point it should mark.
 */
export function RegistrationMark({ className }: RegistrationMarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={cn(
        "pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 text-foreground/40",
        className,
      )}
    >
      <path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth={1} fill="none" />
    </svg>
  );
}
