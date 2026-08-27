"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

/**
 * Shared, quiet scroll-reveal building blocks for general page/section
 * animation (not the 3D hero -- that stays on its own GSAP timeline).
 *
 * Respects prefers-reduced-motion: falls back to plain elements with no
 * animation, consistent with how the 3D hero already treats reduced motion
 * (see `useCanShow3D`).
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Extra delay in seconds, useful for offsetting a second/third element. */
  delay?: number;
  /** Distance in px the element rises from. Defaults to a subtle 16px. */
  y?: number;
}

/** Fades + rises a single block in once, when it scrolls into view. */
export function Reveal({ children, className, delay = 0, y = 16 }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

interface RevealGroupProps {
  children: ReactNode;
  className?: string;
}

/** Wrap a list/grid; each direct `<RevealItem>` child staggers in together. */
export function RevealGroup({ children, className }: RevealGroupProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: RevealGroupProps) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}
