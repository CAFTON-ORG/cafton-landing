"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { useInViewport } from "@/hooks/use-in-viewport";
import { buildCaftonMarkFacets, MARK_COLOR } from "@/lib/cafton-mark-geometry";

// Same camera/fov/scale as the hero's own full-bleed placement
// (hero-scene.tsx) -- this mark is now composed the same way (full-bleed,
// centered, typography layered above it), so its proven, clip-free
// values are reused rather than re-guessed for a new composition.
const MARK_SCALE = 1 / 14;
const EXTRUDE_DEPTH = 6;

/** Radians of ambient spin per second, independent of scroll. */
const IDLE_SPIN_SPEED = 0.1;

/** Extra full turns added across the section's own scroll distance. */
const SCROLL_TURNS = 2;

function RotatingMark({
  isDark,
  progressRef,
}: {
  isDark: boolean;
  progressRef: RefObject<number>;
}) {
  const groupRef = useRef<Group>(null);
  const geometries = useMemo(
    () => buildCaftonMarkFacets(MARK_SCALE, EXTRUDE_DEPTH),
    []
  );

  useEffect(() => {
    return () => {
      geometries.forEach((geometry) => geometry.dispose());
    };
  }, [geometries]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime;

    group.rotation.y = t * IDLE_SPIN_SPEED + progressRef.current * Math.PI * 2 * SCROLL_TURNS;
    group.rotation.x = Math.sin(t * 0.2) * 0.08 + progressRef.current * 0.6;
  });

  return (
    <group ref={groupRef}>
      {geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshStandardMaterial
            color={isDark ? MARK_COLOR.dark : MARK_COLOR.light}
            flatShading
            roughness={isDark ? 0.4 : 0.32}
            metalness={isDark ? 0.05 : 0.15}
          />
        </mesh>
      ))}
    </group>
  );
}

interface DifferentiatorsMarkProps {
  /** Raw 0-1 scroll progress across the section, updated by the parent's
   *  own ScrollTrigger. A ref, not a prop that changes on every render --
   *  this drives per-frame rotation directly, the same way the hero's
   *  mark reads its own scroll store, without pushing 60fps updates
   *  through React state. */
  progressRef: RefObject<number>;
}

/**
 * A third placement of the Cafton mark, always fully assembled (no
 * scatter/resolve -- that story belongs to the hero). Spins on a slow
 * ambient rotation plus extra turns tied to how far the user has
 * scrolled through the section it's mounted in.
 */
export function DifferentiatorsMark({ progressRef }: DifferentiatorsMarkProps) {
  const theme = useResolvedTheme();
  const isDark = theme === "dark";
  const [containerRef, inViewport] = useInViewport<HTMLDivElement>();

  return (
    <div ref={containerRef} className="h-full w-full" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 9], fov: 36 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        performance={{ min: 0.5 }}
        frameloop={inViewport ? "always" : "never"}
      >
        <ambientLight intensity={isDark ? 0.6 : 0.95} />
        <directionalLight position={[3, 3, 3]} intensity={isDark ? 0.9 : 1.7} />
        <directionalLight position={[-3, -2, 2]} intensity={isDark ? 0.3 : 0.55} />
        <RotatingMark isDark={isDark} progressRef={progressRef} />
      </Canvas>
    </div>
  );
}
