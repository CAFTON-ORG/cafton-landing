import { Color, Vector3 } from "three";

export const MARK_SCALE = 1 / 14;
export const EXTRUDE_DEPTH = 6;

export const BASE_Y = -0.1;

export const SCATTER_FACE_Y = -0.5;

export const REST_FACE_Y = 0;

/** Radians of rotation per pixel of pointer drag. */
export const DRAG_ROTATE_SPEED = 0.008;

/** Clamp on the drag-driven tilt so the mark can't be dragged upside down. */
export const DRAG_TILT_CLAMP = 0.9;

/** Per-frame velocity decay once the pointer is released, for a coasting spin. */
export const INERTIA_DAMPING = 0.94;

export const INERTIA_MIN_VELOCITY = 0.0002;

/** Movement/time budget for a pointer-down+up pair to still count as a click rather than a drag. */
export const CLICK_MOVE_TOLERANCE_PX = 6;
export const CLICK_TIME_TOLERANCE_MS = 450;

export const BUILD_DURATION = 1.1;
export const GLOW_PEAK_DURATION = 0.45;
export const GLOW_SETTLE_DURATION = 0.65;
export const GLOW_REST_INTENSITY = 0.18;
export const POST_BUILD_HOLD_MS = 550;

export const easeOutQuad = (x: number) => 1 - (1 - x) * (1 - x);
export const easeInOutQuad = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

/** The glow flares to full, then settles to its resting level, over the build. */
export function glowAt(elapsed: number) {
  if (elapsed < GLOW_PEAK_DURATION) return easeOutQuad(elapsed / GLOW_PEAK_DURATION);
  const settle = Math.min((elapsed - GLOW_PEAK_DURATION) / GLOW_SETTLE_DURATION, 1);
  return 1 + (GLOW_REST_INTENSITY - 1) * easeInOutQuad(settle);
}

/**
 * The build "flash". On a dark page it is a white emissive burst. On a light
 * page that would wash the (light) mark out against the background, so there
 * the mark flashes darker instead -- it stays the most visible thing on screen.
 */
export const LIGHT_FLASH_COLOR = new Color("#2e2e2e");
export const LIGHT_FLASH_STRENGTH = 0.75;

export interface FacetSeed {
  scatter: Vector3;
  scatterRotation: Vector3;
  wobbleSpeed: number;
  wobbleOffset: number;
}

/**
 * Fixed per-facet scatter, keyed only by the facet's own index -- the
 * same arrangement every load, rather than a fresh `Math.random()` roll
 * each mount. The mark is meant to read as one deliberately-designed
 * "shattered" resting state, not a different random pile every visit.
 */
export function seededScatter(index: number, total: number): FacetSeed {
  const angle = (index / total) * Math.PI * 2;
  return {
    scatter: new Vector3(
      Math.cos(angle) * 1.7,
      Math.sin(angle * 1.3) * 1.4,
      Math.sin(angle) * 1.0
    ),
    scatterRotation: new Vector3(
      Math.sin(angle) * Math.PI * 0.6,
      Math.cos(angle * 0.7) * Math.PI * 0.6,
      Math.sin(angle * 1.5) * Math.PI * 0.6
    ),
    wobbleSpeed: 0.3 + (index % 3) * 0.12,
    wobbleOffset: angle,
  };
}
