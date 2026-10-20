import { useId } from "react";
import { LOGO_PATH_D } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

interface MarkWatermarkProps {
  className?: string;
}

/**
 * The Cafton mark as an oversized watermark for banner backgrounds: a soft
 * gradient fill (strongest at the top right, dissolving toward the bottom
 * left) under a hairline outline that keeps a constant 1px at any size
 * (`vector-effect`). The left edge also fades out so copy never sits on a
 * line. Purely decorative and static (no animation, no JS), so it costs
 * nothing at runtime. Position and size come from `className`.
 */
export function MarkWatermark({ className }: MarkWatermarkProps) {
  const gradientId = useId();

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 36 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "pointer-events-none absolute text-foreground [mask-image:linear-gradient(to_right,transparent_0%,#000_55%)]",
        className,
      )}
    >
      <defs>
        <linearGradient id={gradientId} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity={0.55} />
          <stop offset="1" stopColor="currentColor" stopOpacity={0.08} />
        </linearGradient>
      </defs>
      <path d={LOGO_PATH_D} fill={`url(#${gradientId})`} />
      <path
        d={LOGO_PATH_D}
        stroke="currentColor"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
