"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { SystemHub } from "@/components/contact/system-hub";
import { servicePillars } from "@/lib/services";

interface NodeOffset {
  x: number;
  y: number;
  rotate: number;
}

/** Loose, uneven positions -- reads as scattered/manual, not a tidy grid. */
const SCATTERED: NodeOffset[] = [
  { x: -108, y: -76, rotate: -18 },
  { x: 102, y: -88, rotate: 22 },
  { x: -94, y: 88, rotate: 14 },
  { x: 114, y: 74, rotate: -24 },
];

/** Even corners around the hub -- reads as one deliberate system. */
const CONNECTED: NodeOffset[] = [
  { x: -88, y: -88, rotate: 0 },
  { x: 88, y: -88, rotate: 0 },
  { x: -88, y: 88, rotate: 0 },
  { x: 88, y: 88, rotate: 0 },
];

const AUTO_CYCLE_MS = 2800;

/**
 * The site's own 4 service pillars, scattered and disconnected, animating
 * into one system built around the 3D Cafton mark -- the same pitch the
 * contact form itself is making, not just a spinning logo. Loops on its
 * own (so the story plays out on touch devices too) and holds the
 * "connected" state while hovered. Reduced-motion visitors get the
 * resolved state, static.
 */
export function SystemGraphic() {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [autoConnected, setAutoConnected] = useState(true);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => setAutoConnected((v) => !v), AUTO_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const connected = reduceMotion ? true : hovered || autoConnected;

  return (
    <div
      className="relative flex h-full w-full items-center justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {servicePillars.map((pillar, i) => {
        const pos = connected ? CONNECTED[i] : SCATTERED[i];
        const length = Math.hypot(pos.x, pos.y);
        const angle = (Math.atan2(pos.y, pos.x) * 180) / Math.PI;
        return (
          <div
            key={`line-${pillar.slug}`}
            className="absolute left-1/2 top-1/2 h-0.5 origin-left bg-foreground/40 transition-[transform,opacity] duration-700 ease-out"
            style={{
              width: length,
              transform: `rotate(${angle}deg) scaleX(${connected ? 1 : 0})`,
              opacity: connected ? 1 : 0,
            }}
          />
        );
      })}

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="size-24 transition-transform duration-700 ease-out"
          style={{ transform: `scale(${connected ? 1.1 : 1})` }}
        >
          <SystemHub />
        </div>
      </div>

      {servicePillars.map((pillar, i) => {
        const pos = connected ? CONNECTED[i] : SCATTERED[i];
        return (
          <div
            key={pillar.slug}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div
              className="transition-transform duration-700 ease-out"
              style={{ transform: `translate(${pos.x}px, ${pos.y}px) rotate(${pos.rotate}deg)` }}
            >
              <pillar.icon className="size-8 text-foreground" aria-hidden="true" />
            </div>
          </div>
        );
      })}

      <span className="sr-only">
        An animation of Cafton&apos;s four service areas --{" "}
        {servicePillars.map((p) => p.title).join(", ")} -- connecting into one system.
      </span>
    </div>
  );
}
