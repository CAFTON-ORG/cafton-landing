import { DotPattern } from "@/components/shared/dot-pattern";
import { Logo } from "@/components/shared/logo";

/**
 * On-brand cover for any blog post or project that has no image of its own:
 * the site's dot-pattern and glow behind the Cafton mark. Fills its
 * nearest positioned parent, so it drops in wherever an `<Image fill>` would
 * go and scales with whatever frame it is given.
 */
export function CoverArt() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center bg-muted/40"
    >
      <DotPattern size="md" opacity="low" fadeStyle="none" />
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_50%,color-mix(in_oklch,var(--foreground)_14%,transparent)_0%,transparent_60%)]" />
      <Logo size={64} className="relative h-[34%] w-auto text-foreground/80" />
    </div>
  );
}
