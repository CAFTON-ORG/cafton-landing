"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { useInViewport } from "@/hooks/use-in-viewport";
import { useWebglContextRecovery } from "@/hooks/use-webgl-context-recovery";
import { buildCaftonMarkFacets, MARK_COLOR } from "@/lib/cafton-mark-geometry";

// Same proven camera/fov/scale as the hero and Differentiators placements.
const MARK_SCALE = 1 / 14;
const EXTRUDE_DEPTH = 6;

/** Radians of ambient spin per second. */
const IDLE_SPIN_SPEED = 0.15;

function RotatingMark({ isDark }: { isDark: boolean }) {
  const groupRef = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const geometries = useMemo(
    () => buildCaftonMarkFacets(MARK_SCALE, EXTRUDE_DEPTH),
    [],
  );

  useEffect(() => {
    return () => {
      geometries.forEach((geometry) => geometry.dispose());
    };
  }, [geometries]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime;

    // Smoothed toward the pointer rather than snapping straight to it --
    // same easing constant the hero uses for its own pointer-follow tilt.
    pointer.current.x += (state.pointer.x - pointer.current.x) * Math.min(delta * 2.5, 1);
    pointer.current.y += (state.pointer.y - pointer.current.y) * Math.min(delta * 2.5, 1);

    group.rotation.y = t * IDLE_SPIN_SPEED + pointer.current.x * 0.35;
    group.rotation.x = Math.sin(t * 0.2) * 0.08 - pointer.current.y * 0.2;
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

/**
 * A fourth placement of the Cafton mark (hero, Differentiators, now the
 * contact page's system-graphic hub): always fully assembled, idle-
 * spinning with a subtle pointer-follow tilt. No click-to-build or drag --
 * that story stays the hero's alone.
 */
export function ContactMark() {
  const theme = useResolvedTheme();
  const isDark = theme === "dark";
  const [containerRef, inViewport] = useInViewport<HTMLDivElement>();
  const { canvasKey, handleCreated } = useWebglContextRecovery();

  return (
    <div ref={containerRef} className="h-full w-full" aria-hidden="true">
      <Canvas
        key={canvasKey}
        camera={{ position: [0, 0, 9], fov: 36 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        performance={{ min: 0.5 }}
        frameloop={inViewport ? "always" : "never"}
        onCreated={handleCreated}
      >
        <ambientLight intensity={isDark ? 0.6 : 0.95} />
        <directionalLight position={[3, 3, 3]} intensity={isDark ? 0.9 : 1.7} />
        <directionalLight position={[-3, -2, 2]} intensity={isDark ? 0.3 : 0.55} />
        <RotatingMark isDark={isDark} />
      </Canvas>
    </div>
  );
}
