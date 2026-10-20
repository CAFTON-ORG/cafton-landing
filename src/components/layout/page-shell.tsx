import type { ReactNode } from "react";
import { DotPattern } from "@/components/shared/dot-pattern";
import { MarkWatermark } from "@/components/shared/mark-watermark";
import { RegistrationMark } from "@/components/shared/registration-mark";
import { cn } from "@/lib/utils";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

/** Shared content width and responsive gutters for every marketing page. */
export function PageShell({ children, className = "", id }: PageShellProps) {
  return (
    <div
      id={id}
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
  /**
   * "compact" is for index and detail pages, where the content is what the
   * visitor came for: about half the height of the default band. Home-style
   * pages (About, Contact, Careers) keep the roomier default.
   */
  variant?: "default" | "compact";
}

// The top padding includes the 4rem band the floating nav header overlaps.
export function PageHero({ children, image, variant = "default" }: PageHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden border-b bg-muted/30",
        variant === "compact"
          ? "pb-10 pt-28 sm:pb-12 sm:pt-32 lg:pb-14 lg:pt-36"
          : "pb-20 pt-36 sm:pb-24 sm:pt-40 lg:pb-28 lg:pt-44",
      )}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <DotPattern size="md" fadeStyle="ellipse" opacity="low" />
        <div className="absolute inset-0 [background:radial-gradient(circle_at_15%_0%,color-mix(in_oklch,var(--foreground)_8%,transparent)_0%,transparent_55%)]" />
        {/* A hero with its own image (About) already fills the right side; every other hero gets the mark. */}
        {!image && (
          <MarkWatermark className="-right-16 top-1/2 h-[34rem] w-auto -translate-y-1/2 opacity-[0.2] sm:-right-10 sm:h-[40rem] lg:right-[max(-2rem,calc(50%-44rem))] lg:h-[44rem]" />
        )}
        {/* Blueprint finish: a hairline that fades out at both ends, with
            registration marks on the content's left and right edges. */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-foreground/30 to-transparent" />
        <RegistrationMark className="bottom-0 left-[max(1.25rem,calc(50%-38rem))]" />
        <RegistrationMark className="bottom-0 left-[min(calc(100%-1.25rem),calc(50%+38rem))]" />
      </div>
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
