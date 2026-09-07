"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
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
const SPRING = { type: "spring", stiffness: 90, damping: 16 } as const;

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
          <motion.div
            key={`line-${pillar.slug}`}
            className="absolute left-1/2 top-1/2 h-0.5 origin-left bg-foreground/40"
            style={{ width: length }}
            animate={{ rotate: angle, scaleX: connected ? 1 : 0, opacity: connected ? 1 : 0 }}
            transition={SPRING}
          />
        );
      })}

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: connected ? 1.1 : 1 }}
          transition={SPRING}
          className="size-24"
        >
          <SystemHub />
        </motion.div>
      </div>

      {servicePillars.map((pillar, i) => {
        const pos = connected ? CONNECTED[i] : SCATTERED[i];
        return (
          <div
            key={pillar.slug}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <motion.div
              animate={{ x: pos.x, y: pos.y, rotate: pos.rotate }}
              transition={SPRING}
            >
              <pillar.icon className="size-8 text-foreground" aria-hidden="true" />
            </motion.div>
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
