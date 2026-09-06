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

interface PageHeroProps {
  /**
   * The hero's copy. When `image` is passed, this goes directly here
   * WITHOUT its own `<PageShell>` wrapper -- `PageHero` handles the shell
   * itself in that case, so the copy and the image share one grid instead
   * of nesting two shells. Without `image`, wrap `children` in
   * `<PageShell>` yourself as every existing page already does.
   */
  children: ReactNode;
  /**
   * Optional visual to run alongside the copy (a photo, an
   * `ImagePlaceholder`, etc.). When omitted the hero stays the plain
   * centered-text band every page has used so far -- passing one splits
   * the hero into a two-column layout instead.
   */
  image?: ReactNode;
}

export function PageHero({ children, image }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b bg-muted/30 py-20 sm:py-24 lg:py-28">
      <div className="pointer-events-none absolute inset-0">
        <DotPattern size="md" fadeStyle="ellipse" opacity="low" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_15%_0%,color-mix(in_oklch,var(--foreground)_8%,transparent)_0%,transparent_55%)]"
      />
      <div className="relative">
        {image ? (
          <PageShell className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
            <div>{children}</div>
            <div className="aspect-4/3 w-full lg:aspect-square">{image}</div>
          </PageShell>
        ) : (
          children
        )}
      </div>
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
