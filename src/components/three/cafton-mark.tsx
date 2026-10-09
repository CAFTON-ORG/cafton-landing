"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, Group, MathUtils, Mesh, MeshStandardMaterial, PointLight } from "three";
import { buildCaftonMarkFacets, MARK_COLOR } from "@/lib/cafton-mark-geometry";
import { markHeroReady } from "@/lib/hero-ready";
import { MARK_SCALE, EXTRUDE_DEPTH, BASE_Y, SCATTER_FACE_Y, REST_FACE_Y, DRAG_ROTATE_SPEED, DRAG_TILT_CLAMP, INERTIA_DAMPING, INERTIA_MIN_VELOCITY, CLICK_MOVE_TOLERANCE_PX, CLICK_TIME_TOLERANCE_MS, BUILD_DURATION, GLOW_REST_INTENSITY, POST_BUILD_HOLD_MS, easeInOutCubic, glowAt, LIGHT_FLASH_COLOR, LIGHT_FLASH_STRENGTH, FacetSeed, seededScatter } from "@/components/three/hero-scene-motion";

export interface CaftonMarkProps {
  isDark: boolean;
  /** Fired the instant a click is recognized, before the build tween starts. */
  onBuildStart?: () => void;
  /** Fired once the build has finished and held for a beat. */
  onBuildComplete?: () => void;
}

export function CaftonMark({ isDark, onBuildStart, onBuildComplete }: CaftonMarkProps) {
  const groupRef = useRef<Group>(null);
  const facetRefs = useRef<(Mesh | null)[]>([]);
  const glowLightRef = useRef<PointLight>(null);

  const geometries = useMemo(
    () => buildCaftonMarkFacets(MARK_SCALE, EXTRUDE_DEPTH),
    []
  );
  const seeds = useMemo<FacetSeed[]>(
    () => geometries.map((_, i) => seededScatter(i, geometries.length)),
    [geometries]
  );

  const baseColor = useMemo(
    () => new Color(isDark ? MARK_COLOR.dark : MARK_COLOR.light),
    [isDark]
  );

  const readyFired = useRef(false);
  const invalidate = useThree((state) => state.invalidate);
  /** Frame timings, used once to drop the render resolution on slow devices. */
  const frameStats = useRef({ frames: 0, total: 0, settled: false });
  const pointer = useRef({ x: 0, y: 0 });
  const hovering = useRef(false);
  const hoverScale = useRef(1);

  const built = useRef(false);
  const building = useRef(false);
  const buildStartedAt = useRef(0);
  /** Tweened by GSAP on click -- read directly in the frame loop, not via React state. */
  const build = useRef({ progress: 0, glow: 0 });

  /**
   * Click-drag rotation, plus the click-vs-drag disambiguation for the
   * build trigger below. `rotationX/Y` are the accumulated offset applied
   * on top of the mark's own settle rotation; `velocityX/Y` is the last
   * frame's drag speed, which keeps driving `rotationX/Y` after release
   * (decayed by `INERTIA_DAMPING`) so a flick coasts to a stop instead of
   * halting the instant the pointer lifts.
   */
  const drag = useRef({
    active: false,
    lastX: 0,
    lastY: 0,
    downX: 0,
    downY: 0,
    downTime: 0,
    velocityX: 0,
    velocityY: 0,
    rotationX: 0,
    rotationY: 0,
  });

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
    };
  }, []);

  const triggerBuild = useCallback(() => {
    if (built.current || building.current) return;
    building.current = true;
    buildStartedAt.current = performance.now();
    onBuildStart?.();
  }, [onBuildStart]);

  // Registered on window (not the mesh) so the drag keeps tracking even
  // when the pointer moves off the mark mid-gesture.
  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      invalidate();
      const d = drag.current;
      if (!d.active) return;
      const dx = event.clientX - d.lastX;
      const dy = event.clientY - d.lastY;
      d.lastX = event.clientX;
      d.lastY = event.clientY;
      d.velocityY = dx * DRAG_ROTATE_SPEED;
      d.velocityX = dy * DRAG_ROTATE_SPEED;
      d.rotationY += d.velocityY;
      d.rotationX = MathUtils.clamp(
        d.rotationX + d.velocityX,
        -DRAG_TILT_CLAMP,
        DRAG_TILT_CLAMP
      );
    };

    const handlePointerUp = (event: PointerEvent) => {
      invalidate();
      const d = drag.current;
      const moved = Math.hypot(event.clientX - d.downX, event.clientY - d.downY);
      const elapsed = performance.now() - d.downTime;
      d.active = false;
      document.body.style.cursor = hovering.current ? (built.current ? "grab" : "pointer") : "";

      if (moved < CLICK_MOVE_TOLERANCE_PX && elapsed < CLICK_TIME_TOLERANCE_MS) {
        triggerBuild();
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [triggerBuild, invalidate]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (!readyFired.current) {
      readyFired.current = true;
      // After the browser has presented this first frame, not before. The
      // site loader waits on this so it never reveals an empty hero.
      requestAnimationFrame(markHeroReady);
    }

    if (building.current) {
      const elapsed = (performance.now() - buildStartedAt.current) / 1000;
      if (elapsed >= BUILD_DURATION) {
        build.current.progress = 1;
        build.current.glow = GLOW_REST_INTENSITY;
        built.current = true;
        building.current = false;
        window.setTimeout(() => onBuildComplete?.(), POST_BUILD_HOLD_MS);
      } else {
        build.current.progress = easeInOutCubic(elapsed / BUILD_DURATION);
        build.current.glow = glowAt(elapsed);
      }
    }

    const eased = build.current.progress;
    const unresolved = 1 - eased;
    const t = state.clock.elapsedTime;

    pointer.current.x += (state.pointer.x - pointer.current.x) * Math.min(delta * 2.5, 1);
    pointer.current.y += (state.pointer.y - pointer.current.y) * Math.min(delta * 2.5, 1);

    // Coast once released: keep applying the last drag velocity, decaying
    // it toward zero, rather than snapping to a stop.
    if (!drag.current.active) {
      const d = drag.current;
      d.rotationY += d.velocityY;
      d.rotationX = MathUtils.clamp(
        d.rotationX + d.velocityX,
        -DRAG_TILT_CLAMP,
        DRAG_TILT_CLAMP
      );
      d.velocityX *= INERTIA_DAMPING;
      d.velocityY *= INERTIA_DAMPING;
      if (Math.abs(d.velocityX) < INERTIA_MIN_VELOCITY) d.velocityX = 0;
      if (Math.abs(d.velocityY) < INERTIA_MIN_VELOCITY) d.velocityY = 0;
    }

    hoverScale.current = MathUtils.lerp(
      hoverScale.current,
      hovering.current || drag.current.active ? 1.04 : 1,
      Math.min(delta * 6, 1)
    );

    const settleY = MathUtils.lerp(SCATTER_FACE_Y, REST_FACE_Y, eased);
    const idleSway = Math.sin(t * 0.25) * 0.05 * unresolved;
    const pointerInfluenceY = pointer.current.x * 0.2 * (1 - eased * 0.4);

    group.rotation.y = settleY + idleSway + pointerInfluenceY + drag.current.rotationY;
    group.rotation.x =
      -eased * Math.PI * 0.08 -
      pointer.current.y * 0.12 * (1 - eased * 0.3) +
      drag.current.rotationX;
    group.position.y = BASE_Y;
    group.position.z = eased * 0.6;
    group.scale.setScalar((1 + eased * 0.15) * hoverScale.current);

    if (glowLightRef.current) {
      glowLightRef.current.intensity = isDark ? build.current.glow * 3 : 0;
    }

    facetRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const seed = seeds[i];
      const wobble = Math.sin(t * seed.wobbleSpeed + seed.wobbleOffset) * 0.5 + 0.5;
      const magnitude = unresolved * (0.7 + wobble * 0.3);
      mesh.position.set(
        seed.scatter.x * magnitude,
        seed.scatter.y * magnitude,
        seed.scatter.z * magnitude
      );
      mesh.rotation.set(
        seed.scatterRotation.x * magnitude,
        seed.scatterRotation.y * magnitude,
        seed.scatterRotation.z * magnitude
      );
      const material = mesh.material as MeshStandardMaterial;
      if (isDark) {
        material.emissiveIntensity = build.current.glow;
      } else {
        material.color
          .copy(baseColor)
          .lerp(LIGHT_FLASH_COLOR, build.current.glow * LIGHT_FLASH_STRENGTH);
      }
    });

    // Judge the device on its first ~100 frames (skipping start-up) and
    // render at 1x from then on if it can't hold ~40fps.
    const stats = frameStats.current;
    if (!stats.settled) {
      stats.frames += 1;
      if (stats.frames > 20) stats.total += delta;
      if (stats.frames === 110) {
        stats.settled = true;
        if (stats.total / 90 > 0.026) state.setDpr(1);
      }
    }

    // The loop only runs on demand: once the mark is built and everything has
    // settled, nothing is drawn until the pointer moves again, so an idle hero
    // costs no GPU time while the visitor scrolls the page.
    const d = drag.current;
    const hoverTarget = hovering.current || d.active ? 1.04 : 1;
    const moving =
      !built.current ||
      d.active ||
      d.velocityX !== 0 ||
      d.velocityY !== 0 ||
      Math.abs(state.pointer.x - pointer.current.x) > 0.001 ||
      Math.abs(state.pointer.y - pointer.current.y) > 0.001 ||
      Math.abs(hoverScale.current - hoverTarget) > 0.001;
    if (moving) state.invalidate();
  });

  return (
    <group
      ref={groupRef}
      onPointerDown={(event) => {
        event.stopPropagation();
        invalidate();
        const d = drag.current;
        d.active = true;
        d.lastX = event.clientX;
        d.lastY = event.clientY;
        d.downX = event.clientX;
        d.downY = event.clientY;
        d.downTime = performance.now();
        d.velocityX = 0;
        d.velocityY = 0;
        document.body.style.cursor = "grabbing";
      }}
      onPointerOver={() => {
        hovering.current = true;
        invalidate();
        if (!drag.current.active) {
          document.body.style.cursor = built.current ? "grab" : "pointer";
        }
      }}
      onPointerOut={() => {
        hovering.current = false;
        invalidate();
        if (!drag.current.active) document.body.style.cursor = "";
      }}
    >
      <pointLight ref={glowLightRef} position={[0, 0, 3]} intensity={0} distance={9} color="#ffffff" />
      {geometries.map((geometry, i) => (
        <mesh
          key={i}
          ref={(el) => {
            facetRefs.current[i] = el;
          }}
          geometry={geometry}
        >
          <meshStandardMaterial
            color={isDark ? MARK_COLOR.dark : MARK_COLOR.light}
            emissive="#ffffff"
            emissiveIntensity={0}
            flatShading
            roughness={isDark ? 0.4 : 0.32}
            metalness={isDark ? 0.05 : 0.15}
          />
        </mesh>
      ))}
    </group>
  );
}
