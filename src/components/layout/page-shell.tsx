import type { ReactNode } from "react";
import { DotPattern } from "@/components/shared/dot-pattern";
import { cn } from "@/lib/utils";

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

/** Shared content width and responsive gutters for every marketing page. */
export function PageShell({ children, className = "" }: PageShellProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8", className)}
    >
      {children}
    </div>
  );
}

export function PageHero({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b bg-muted/30 py-20 sm:py-24 lg:py-28">
      <div className="pointer-events-none absolute inset-0">
        <DotPattern size="md" fadeStyle="ellipse" opacity="low" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_15%_0%,color-mix(in_oklch,var(--foreground)_8%,transparent)_0%,transparent_55%)]"
      />
      <div className="relative">{children}</div>
    </section>
  );
}

export function PageSection({ children, className = "" }: PageShellProps) {
  return (
    <section className={cn("py-14 sm:py-16 lg:py-20", className)}>
      {children}
    </section>
  );
}
