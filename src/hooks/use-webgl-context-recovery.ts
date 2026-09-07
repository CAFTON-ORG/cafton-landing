"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RootState } from "@react-three/fiber";

/**
 * WebGL context loss is a real, on-device failure mode, not just a
 * theoretical one -- Safari enforces a strict per-page limit on
 * simultaneous WebGL contexts, and mounting/unmounting canvases across
 * client-side route changes (exactly what happens navigating between
 * this site's pages) is a documented way to exceed it, since a torn-down
 * context isn't always reclaimed by the browser as fast as a new one
 * gets created. `CanvasErrorBoundary` (DEC-042) catches a *new* context
 * failing to be created; it does nothing for a context that dies
 * mid-session on an already-mounted, already-rendering canvas -- that
 * canvas just goes blank in place, with nothing thrown for a boundary to
 * catch.
 *
 * Two things this hook does about it:
 *
 * 1. Explicitly releases the context on unmount (`forceContextLoss`),
 *    defense-in-depth alongside react-three-fiber's own automatic
 *    cleanup, so navigating away from a page frees its GPU resources as
 *    deterministically as possible rather than waiting on the browser's
 *    own reclaim timing.
 * 2. Rebuilds after a loss. Neither Three.js nor react-three-fiber
 *    restore a lost context's GPU resources automatically on
 *    `webglcontextrestored` -- the app has to react to it. Every mark on
 *    this project builds its geometry via `useMemo` inside the component
 *    tree (not external/imperative state), so the correct rebuild is a
 *    full remount: bump a key and let React reconstruct everything from
 *    scratch, the same "rebuild from source of truth" the library's own
 *    maintainers recommend over trying to manually restore GPU state.
 */
export function useWebglContextRecovery() {
  const [canvasKey, setCanvasKey] = useState(0);
  const rendererRef = useRef<RootState["gl"] | null>(null);

  const handleCreated = useCallback(({ gl }: RootState) => {
    rendererRef.current = gl;
    const canvas = gl.domElement;

    // Without preventDefault, the browser treats a lost context as
    // permanent and never fires "restored" at all.
    const handleLost = (event: Event) => event.preventDefault();
    const handleRestored = () => setCanvasKey((key) => key + 1);

    canvas.addEventListener("webglcontextlost", handleLost, false);
    canvas.addEventListener("webglcontextrestored", handleRestored, false);
  }, []);

  useEffect(() => {
    return () => {
      rendererRef.current?.forceContextLoss();
    };
  }, [canvasKey]);

  return { canvasKey, handleCreated };
}
