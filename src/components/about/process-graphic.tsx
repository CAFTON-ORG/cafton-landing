"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Lightbulb, PenTool, Code2, Rocket, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Understand", icon: Lightbulb },
  { label: "Design", icon: PenTool },
  { label: "Engineer", icon: Code2 },
  { label: "Deploy", icon: Rocket },
  { label: "Improve", icon: TrendingUp },
];

const STEP_DURATION_MS = 1700;

/**
 * A visual for the "How we work" line already on this page (Understand ->
 * Design -> Engineer -> Deploy -> Improve): the active step advances on
 * its own loop, or jumps to whichever step is hovered/focused. Reduced-
 * motion visitors get the loop replaced by the final, resolved state.
 */
export function ProcessGraphic() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % STEPS.length);
    }, STEP_DURATION_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const current = hovered ?? (reduceMotion ? STEPS.length - 1 : active);

  return (
    <div className="flex items-start">
      {STEPS.map((step, i) => (
        <div key={step.label} className="flex flex-1 items-start last:flex-initial">
          <button
            type="button"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
            className="flex cursor-pointer flex-col items-center gap-2 focus-visible:outline-none"
          >
            <motion.div
              animate={{ scale: current === i ? 1.15 : 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className={cn(
                "flex size-11 items-center justify-center rounded-full border transition-colors",
                current === i
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground",
              )}
            >
              <step.icon className="size-5" aria-hidden="true" />
            </motion.div>
            <span
              className={cn(
                "text-xs font-medium transition-colors",
                current === i ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </button>
          {i < STEPS.length - 1 && (
            // Same height as the icon circle above, centered within it --
            // so the line lands on the circle's own vertical center without
            // guessing a pixel offset from the label sitting below it.
            <div className="flex h-11 flex-1 items-center">
              <div className="relative mx-2 h-px w-full bg-border">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-foreground"
                  animate={{ width: current > i ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
