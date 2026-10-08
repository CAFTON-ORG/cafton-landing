"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Color, Group, MathUtils, Mesh, MeshStandardMaterial, PointLight, Vector3 } from "three";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { useWebglContextRecovery } from "@/hooks/use-webgl-context-recovery";
import { buildCaftonMarkFacets, MARK_COLOR } from "@/lib/cafton-mark-geometry";
import { markHeroReady, resetHeroReady } from "@/lib/hero-ready";

const MARK_SCALE = 1 / 14;
const EXTRUDE_DEPTH = 6;

const BASE_Y = -0.1;

const SCATTER_FACE_Y = -0.5;

const REST_FACE_Y = 0;

/** Radians of rotation per pixel of pointer drag. */
const DRAG_ROTATE_SPEED = 0.008;

/** Clamp on the drag-driven tilt so the mark can't be dragged upside down. */
const DRAG_TILT_CLAMP = 0.9;

/** Per-frame velocity decay once the pointer is released, for a coasting spin. */
const INERTIA_DAMPING = 0.94;

const INERTIA_MIN_VELOCITY = 0.0002;

/** Movement/time budget for a pointer-down+up pair to still count as a click rather than a drag. */
const CLICK_MOVE_TOLERANCE_PX = 6;
const CLICK_TIME_TOLERANCE_MS = 450;

const BUILD_DURATION = 1.1;
const GLOW_PEAK_DURATION = 0.45;
const GLOW_SETTLE_DURATION = 0.65;
const GLOW_REST_INTENSITY = 0.18;
const POST_BUILD_HOLD_MS = 550;

const easeOutQuad = (x: number) => 1 - (1 - x) * (1 - x);
const easeInOutQuad = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

/** The glow flares to full, then settles to its resting level, over the build. */
function glowAt(elapsed: number) {
  if (elapsed < GLOW_PEAK_DURATION) return easeOutQuad(elapsed / GLOW_PEAK_DURATION);
  const settle = Math.min((elapsed - GLOW_PEAK_DURATION) / GLOW_SETTLE_DURATION, 1);
  return 1 + (GLOW_REST_INTENSITY - 1) * easeInOutQuad(settle);
}

/**
 * The build "flash". On a dark page it is a white emissive burst. On a light
 * page that would wash the (light) mark out against the background, so there
 * the mark flashes darker instead -- it stays the most visible thing on screen.
 */
const LIGHT_FLASH_COLOR = new Color("#2e2e2e");
const LIGHT_FLASH_STRENGTH = 0.75;

interface FacetSeed {
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
function seededScatter(index: number, total: number): FacetSeed {
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

function SceneLighting({ isDark }: { isDark: boolean }) {
  return (
    <>
      <ambientLight intensity={isDark ? 0.6 : 0.95} />
      <directionalLight position={[3, 3, 3]} intensity={isDark ? 0.9 : 1.7} />
      <directionalLight position={[-3, -2, 2]} intensity={isDark ? 0.3 : 0.55} />
    </>
  );
}

interface CaftonMarkProps {
  isDark: boolean;
  /** Fired the instant a click is recognized, before the build tween starts. */
  onBuildStart?: () => void;
  /** Fired once the build has finished and held for a beat. */
  onBuildComplete?: () => void;
}

function CaftonMark({ isDark, onBuildStart, onBuildComplete }: CaftonMarkProps) {
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
  }, [triggerBuild]);

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
  });

  return (
    <group
      ref={groupRef}
      onPointerDown={(event) => {
        event.stopPropagation();
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
        if (!drag.current.active) {
          document.body.style.cursor = built.current ? "grab" : "pointer";
        }
      }}
      onPointerOut={() => {
        hovering.current = false;
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

interface HeroSceneProps {
  /**
   * Whether the hero is near the viewport. Drives the render loop only --
   * the Canvas itself stays mounted.
   */
  active: boolean;
  onBuildStart?: () => void;
  onBuildComplete?: () => void;
}

export function HeroScene({ active, onBuildStart, onBuildComplete }: HeroSceneProps) {
  const theme = useResolvedTheme();
  const isDark = theme === "dark";
  const { canvasKey, handleCreated } = useWebglContextRecovery();

  // Leaving the homepage tears the scene down; returning rebuilds it, so the
  // "first frame drawn" signal has to start over for the loader to wait on it.
  useEffect(() => resetHeroReady, []);

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {/*
        Scrolling away pauses the render loop rather than unmounting the
        Canvas. Unmounting also solved the sustained-GPU-load problem, but
        it threw away the WebGL context, so scrolling back up paid to
        rebuild the renderer and geometry -- visible as the mark taking a
        moment to reappear. A paused loop does no per-frame work either,
        and resumes instantly.
      */}
      <Canvas
        key={canvasKey}
        camera={{ position: [0, 0, 9], fov: 36 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        performance={{ min: 0.5 }}
        frameloop={active ? "always" : "never"}
        onCreated={handleCreated}
        // Reserves vertical pan for page scroll; horizontal drag on the
        // mark still reaches the pointer handlers instead of being
        // swallowed by the browser's default touch scrolling.
        style={{ touchAction: "pan-y" }}
      >
        <SceneLighting isDark={isDark} />
        <CaftonMark isDark={isDark} onBuildStart={onBuildStart} onBuildComplete={onBuildComplete} />
      </Canvas>
    </div>
  );
}
