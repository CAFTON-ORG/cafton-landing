"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Box3, ExtrudeGeometry, Group, MathUtils, Mesh, Vector3 } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { useHeroScrollStore } from "@/lib/hero-scroll-store";

gsap.registerPlugin(ScrollTrigger);

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const LOGO_PATH_D =
  "M22.5958 21.4575L12.1834 27.5428L12.1835 27.5487L0.181268 34.571L0.0366773 7.15345L12.1123 14.0489L12.1123 14.0547L22.5883 20.0298L23.8264 20.7372L22.5958 21.4575ZM0.682804 8.19498L12.0305 20.5787L0.816368 33.5218L22.5921 20.7437L0.682804 8.19498ZM23.8293 20.7372L22.5883 20.0298L12.1123 14.0489L12.0388 0.125217L35.8549 13.7088L23.8293 20.7372ZM12.2569 41.4723L12.1835 27.5487L22.5958 21.4575L23.8293 20.7372L35.9284 27.6383L12.2569 41.4723Z";

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 42"><path d="${LOGO_PATH_D}"/></svg>`;

const MARK_SCALE = 1 / 14;
const EXTRUDE_DEPTH = 6;

const BASE_Y = -0.1;

const REVEAL_END = 0.65;

const SCATTER_FACE_Y = -0.5;

const REST_FACE_Y = 0;

/** Seconds for one full click-triggered revolution. */
const SPIN_DURATION = 1.1;

/**
 * Light mode uses a mid grey, not the brand's near-black. At near-zero
 * albedo every facet returns almost no diffuse light, so the mark renders
 * as one flat silhouette with no readable geometry -- the "I just see
 * black" report. A mid grey lets the key light actually separate the
 * facets, and the lighting is lifted to match.
 */
const MARK_COLOR = { dark: "#e5e5e5", light: "#5a5a5a" } as const;

function buildFacetGeometries(): ExtrudeGeometry[] {
  const loader = new SVGLoader();
  const { paths } = loader.parse(LOGO_SVG);
  const shapes = paths.flatMap((path) => path.toShapes());

  const geometries = shapes.map(
    (shape) =>
      new ExtrudeGeometry(shape, {
        depth: EXTRUDE_DEPTH,
        bevelEnabled: false,
        curveSegments: 1,
      })
  );
  const box = new Box3();
  geometries.forEach((geometry) => {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) box.union(geometry.boundingBox);
  });
  const center = box.getCenter(new Vector3());

  geometries.forEach((geometry) => {
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(MARK_SCALE, MARK_SCALE, MARK_SCALE);
    geometry.rotateX(Math.PI); // SVG's Y axis points down; flip upright.
    geometry.computeVertexNormals();
  });

  return geometries;
}

interface FacetSeed {
  scatter: Vector3;
  scatterRotation: Vector3;
  wobbleSpeed: number;
  wobbleOffset: number;
}

function randomSeed(): FacetSeed {
  return {
    scatter: new Vector3(
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 1.6
    ),
    scatterRotation: new Vector3(
      (Math.random() - 0.5) * Math.PI,
      (Math.random() - 0.5) * Math.PI,
      (Math.random() - 0.5) * Math.PI
    ),
    wobbleSpeed: 0.3 + Math.random() * 0.5,
    wobbleOffset: Math.random() * Math.PI * 2,
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

function CaftonMark({ isDark }: { isDark: boolean }) {
  const groupRef = useRef<Group>(null);
  const facetRefs = useRef<(Mesh | null)[]>([]);

  const geometries = useMemo(() => buildFacetGeometries(), []);
  const seeds = useMemo<FacetSeed[]>(
    () => geometries.map(() => randomSeed()),
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
  const spin = useRef({ elapsed: 0, running: false });

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
    };
  }, []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const progress = useHeroScrollStore.getState().progress;
    const revealProgress = Math.min(progress / REVEAL_END, 1);
    const eased = easeInOutCubic(revealProgress);
    const unresolved = 1 - eased;
    const t = state.clock.elapsedTime;

    pointer.current.x += (state.pointer.x - pointer.current.x) * Math.min(delta * 2.5, 1);
    pointer.current.y += (state.pointer.y - pointer.current.y) * Math.min(delta * 2.5, 1);

    // One full revolution on click, eased in and out so it starts and ends
    // at the mark's resting orientation rather than snapping.
    let spinY = 0;
    if (spin.current.running) {
      spin.current.elapsed += delta;
      const spinProgress = Math.min(spin.current.elapsed / SPIN_DURATION, 1);
      spinY = easeInOutCubic(spinProgress) * Math.PI * 2;
      if (spinProgress >= 1) spin.current.running = false;
    }

    const settleY = MathUtils.lerp(SCATTER_FACE_Y, REST_FACE_Y, eased);
    const idleSway = Math.sin(t * 0.25) * 0.05 * unresolved;
    const pointerInfluenceY = pointer.current.x * 0.2 * (1 - eased * 0.4);

    group.rotation.y = settleY + idleSway + pointerInfluenceY + spinY;
    group.rotation.x = -eased * Math.PI * 0.08 - pointer.current.y * 0.12 * (1 - eased * 0.3);
    group.position.y = BASE_Y;
    group.position.z = eased * 0.6;
    group.scale.setScalar(1 + eased * 0.15);

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
    });
  });

  return (
    <group
      ref={groupRef}
      onClick={() => {
        if (spin.current.running) return;
        spin.current = { elapsed: 0, running: true };
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
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
}

export function HeroScene({ active }: HeroSceneProps) {
  const theme = useResolvedTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: "#hero",
      start: "top top",
      end: "bottom top",
      scrub: 1,
      onUpdate: (self) => {
        useHeroScrollStore.getState().setProgress(self.progress);
      },
    });

    return () => {
      trigger.kill();
    };
  }, []);

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
      >
        <SceneLighting isDark={isDark} />
        <CaftonMark isDark={isDark} />
      </Canvas>
    </div>
  );
}
