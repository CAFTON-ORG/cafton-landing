"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { Group, MathUtils, Mesh, MeshStandardMaterial, PointLight, Vector3 } from "three";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { buildCaftonMarkFacets, MARK_COLOR } from "@/lib/cafton-mark-geometry";

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

  // R3F auto-disposes JSX-declared geometries/materials on unmount, but
  // these are built imperatively via useMemo -- dispose them explicitly
  // too, as cheap defense-in-depth against GPU memory pressure.
  useEffect(() => {
    return () => {
      geometries.forEach((geometry) => geometry.dispose());
    };
  }, [geometries]);

  const pointer = useRef({ x: 0, y: 0 });
  const hovering = useRef(false);
  const hoverScale = useRef(1);

  const built = useRef(false);
  const building = useRef(false);
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
    onBuildStart?.();

    gsap
      .timeline({
        onComplete: () => {
          built.current = true;
          building.current = false;
          window.setTimeout(() => onBuildComplete?.(), POST_BUILD_HOLD_MS);
        },
      })
      .to(build.current, { progress: 1, duration: BUILD_DURATION, ease: "power3.inOut" }, 0)
      .to(build.current, { glow: 1, duration: GLOW_PEAK_DURATION, ease: "power2.out" }, 0)
      .to(
        build.current,
        { glow: GLOW_REST_INTENSITY, duration: GLOW_SETTLE_DURATION, ease: "power2.inOut" },
        GLOW_PEAK_DURATION
      );
  }, [onBuildStart, onBuildComplete]);

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
      glowLightRef.current.intensity = build.current.glow * 3;
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
      material.emissiveIntensity = build.current.glow;
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

  const handleCreated = ({ gl }: { gl: { domElement: HTMLCanvasElement } }) => {
    gl.domElement.addEventListener(
      "webglcontextlost",
      (event) => event.preventDefault(),
      false
    );
  };

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
        camera={{ position: [0, 0, 9], fov: 36 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
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
