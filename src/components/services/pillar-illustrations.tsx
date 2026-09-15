import type { SVGProps } from "react";

/**
 * Original, hand-built line-art illustrations, one per service pillar --
 * no AI image generation was available in this environment (no API key,
 * no Python runtime), and no real photography exists yet either, so
 * these stand in as genuinely designed graphics rather than a fabricated
 * "photo." Plain inline SVG, monochrome (`currentColor`), matching the
 * site's existing dark theme and the dot-pattern/line-art language already
 * used elsewhere (`DotPattern`, the loader's self-drawing mark). Each fills
 * its tile edge-to-edge via `preserveAspectRatio="xMidYMid slice"`, the SVG
 * equivalent of `object-cover` on an `<img>`, so swapping in a real photo
 * later is a drop-in change to `PillarGrid`, not a redesign.
 */

type IllustrationProps = SVGProps<SVGSVGElement>;

/** Business Operations Systems: a small workflow board -- task nodes wired together, one already running. */
export function OperationsIllustration(props: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <g stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/25">
        <path d="M110 90 H180 M180 90 V150 M180 150 H250" />
        <path d="M110 150 H140 M140 150 V210 M140 210 H250" />
        <path d="M250 90 H290 M250 210 H290" />
      </g>
      <g className="text-muted-foreground/40">
        <rect x="60" y="70" width="50" height="40" rx="6" stroke="currentColor" strokeWidth="1.5" />
        <rect x="60" y="130" width="50" height="40" rx="6" stroke="currentColor" strokeWidth="1.5" />
        <rect x="220" y="70" width="70" height="40" rx="6" stroke="currentColor" strokeWidth="1.5" />
      </g>
      <rect
        x="220"
        y="190"
        width="70"
        height="40"
        rx="6"
        className="text-foreground/70"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="255" cy="210" r="6" className="text-foreground/70" fill="currentColor" />
      <g className="text-muted-foreground/25" stroke="currentColor" strokeWidth="1.5">
        <circle cx="85" cy="90" r="3" fill="currentColor" stroke="none" />
        <circle cx="85" cy="150" r="3" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

/** Growth Systems: a lead funnel narrowing into an ascending trend line. */
export function GrowthIllustration(props: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M70 80 H190 L160 210 H100 Z"
        className="text-muted-foreground/25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M70 80 H190 M85 125 H175 M100 170 H160" className="text-muted-foreground/20" stroke="currentColor" strokeWidth="1" />
      <g className="text-muted-foreground/25" stroke="currentColor" strokeWidth="1.5">
        <line x1="240" y1="210" x2="240" y2="170" />
        <line x1="265" y1="210" x2="265" y2="140" />
        <line x1="290" y1="210" x2="290" y2="110" />
        <line x1="315" y1="210" x2="315" y2="150" />
      </g>
      <path
        d="M225 175 L250 145 L275 120 L300 90 L325 100"
        className="text-foreground/70"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M312 96 L325 100 L320 113"
        className="text-foreground/70"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="130" cy="210" r="4" className="text-foreground/70" fill="currentColor" />
    </svg>
  );
}

/** Industry Platforms: a central platform hub wired to several industry modules. */
export function IndustryPlatformsIllustration(props: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <g className="text-muted-foreground/25" stroke="currentColor" strokeWidth="1.5">
        <line x1="200" y1="150" x2="120" y2="90" />
        <line x1="200" y1="150" x2="280" y2="90" />
        <line x1="200" y1="150" x2="120" y2="210" />
        <line x1="200" y1="150" x2="280" y2="210" />
        <line x1="200" y1="150" x2="200" y2="230" />
      </g>
      <g className="text-muted-foreground/40" stroke="currentColor" strokeWidth="1.5">
        <rect x="100" y="70" width="40" height="30" rx="5" />
        <rect x="260" y="70" width="40" height="30" rx="5" />
        <rect x="100" y="200" width="40" height="30" rx="5" />
        <rect x="260" y="200" width="40" height="30" rx="5" />
        <rect x="180" y="230" width="40" height="30" rx="5" />
      </g>
      <path
        d="M200 128 L226 143 V172 L200 187 L174 172 V143 Z"
        className="text-foreground/70"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="200" cy="157.5" r="4" className="text-foreground/70" fill="currentColor" />
    </svg>
  );
}

/** New Product Builds: a blueprint-style wireframe screen under construction. */
export function ProductBuildsIllustration(props: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <g className="text-muted-foreground/20" stroke="currentColor" strokeWidth="1" strokeDasharray="4 5">
        <line x1="90" y1="60" x2="90" y2="240" />
        <line x1="310" y1="60" x2="310" y2="240" />
        <line x1="70" y1="70" x2="90" y2="70" />
        <line x1="70" y1="230" x2="90" y2="230" />
      </g>
      <rect
        x="120"
        y="75"
        width="160"
        height="120"
        rx="8"
        className="text-muted-foreground/40"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line x1="120" y1="100" x2="280" y2="100" className="text-muted-foreground/40" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="134" cy="87.5" r="3" className="text-muted-foreground/40" fill="currentColor" />
      <g className="text-muted-foreground/25" stroke="currentColor" strokeWidth="1.5">
        <line x1="136" y1="120" x2="264" y2="120" />
        <line x1="136" y1="138" x2="240" y2="138" />
        <line x1="136" y1="156" x2="252" y2="156" />
      </g>
      <rect
        x="136"
        y="172"
        width="56"
        height="18"
        rx="4"
        className="text-foreground/70"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M280 195 L305 220"
        className="text-foreground/70"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M296 217 L305 220 L302 229"
        className="text-foreground/70"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
