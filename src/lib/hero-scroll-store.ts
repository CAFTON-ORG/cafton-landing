import { create } from "zustand";

interface HeroScrollState {
  /** 0 at the top of the hero, 1 by the time the user has scrolled past it. */
  progress: number;
  setProgress: (progress: number) => void;
}

/**
 * Shared scroll position for the hero's 3D scene.
 *
 * GSAP's ScrollTrigger writes to this (see HeroScene); the R3F render loop
 * reads it via `getState()` inside `useFrame` rather than subscribing, so
 * scroll updates never trigger a React re-render -- only the Three.js
 * objects move.
 */
export const useHeroScrollStore = create<HeroScrollState>((set) => ({
  progress: 0,
  setProgress: (progress) => set({ progress }),
}));
