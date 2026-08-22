import type { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

/** Shared content width and responsive gutters for every marketing page. */
export function PageShell({ children, className = "" }: PageShellProps) {
  return (
    <div
      className={`mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHero({ children }: { children: ReactNode }) {
  return (
    <section className="border-b bg-muted/30 py-16 sm:py-20 lg:py-24">
      {children}
    </section>
  );
}

export function PageSection({ children, className = "" }: PageShellProps) {
  return (
    <section className={`py-14 sm:py-16 lg:py-20 ${className}`}>
      {children}
    </section>
  );
}
