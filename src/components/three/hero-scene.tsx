"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Box3, ExtrudeGeometry, Group, MathUtils, Mesh, Vector3 } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { useTheme } from "@/hooks/use-theme";
import { useHeroScrollStore } from "@/lib/hero-scroll-store";

gsap.registerPlugin(ScrollTrigger);

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// The Cafton mark's own path data -- see src/components/shared/logo.tsx,
// the single source of truth for the brand mark. It's four adjoining
// triangular facets forming one faceted diamond. Kept in sync manually;
// if the logo changes, update both places.
const LOGO_PATH_D =
  "M22.5958 21.4575L12.1834 27.5428L12.1835 27.5487L0.181268 34.571L0.0366773 7.15345L12.1123 14.0489L12.1123 14.0547L22.5883 20.0298L23.8264 20.7372L22.5958 21.4575ZM0.682804 8.19498L12.0305 20.5787L0.816368 33.5218L22.5921 20.7437L0.682804 8.19498ZM23.8293 20.7372L22.5883 20.0298L12.1123 14.0489L12.0388 0.125217L35.8549 13.7088L23.8293 20.7372ZM12.2569 41.4723L12.1835 27.5487L22.5958 21.4575L23.8293 20.7372L35.9284 27.6383L12.2569 41.4723Z";

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 42"><path d="${LOGO_PATH_D}"/></svg>`;

const MARK_SCALE = 1 / 14;
const EXTRUDE_DEPTH = 6;
// Was -0.85 -- pushed the mark low enough that it read as clipped against
// whatever sits below its grid cell. Centered now that it has its own
// dedicated column/row instead of sharing space behind the headline.
const BASE_Y = -0.1;

// How much of the hero's scroll distance the "unresolved -> resolved"
// reveal takes -- 0.65 means the mark (and, in home-hero.tsx, the text)
// finish settling by 65% of the way through the pinned scroll, leaving
// the remaining 35% as a stable, fully-readable hold before the section
// releases. Previously this ran the full 0-1 range, which left almost no
// hold time -- the owner's reported "can't finish reading the CTA" bug.
const REVEAL_END = 0.65;

// Facing rotation (radians) once fully resolved. The owner flagged the
// mark settling "facing left" when it should read facing right (compare
// against the flat mark in logo.tsx / the navbar, which is the canonical
// orientation). This sandbox can't render a live preview to confirm the
// sign visually -- if it still reads mirrored once seen in the browser,
// flip this constant's sign first.
const SCATTER_FACE_Y = -0.5;
// Confirmed against the brand's own reference art (cafton-light.png):
// the mark reads as facing right at its natural, unrotated orientation.
// No offset needed at rest -- 0, not a guess.
const REST_FACE_Y = 0;

/**
 * Parses the logo's own SVG path into one ExtrudeGeometry per facet,
 * positioned relative to each other exactly as they sit in the source
 * mark (so at rest, assembled, the four facets read as the real Cafton
 * logo -- not an approximation of it).
 */
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

  // Each facet is still in the SVG's own coordinate space (Y-down,
  // origin top-left). Union all four bounding boxes first, so every
  // facet is re-centered by the SAME offset -- centering each facet on
  // its own origin independently would tear the mark apart.
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

/**
 * The Cafton mark's four facets, scattered at rest and resolving into
 * the precise, assembled logo as the user scrolls through the hero --
 * the same "unresolved becoming resolved" idea earlier versions told
 * with an abstract shape, now told with the brand mark itself. Also
 * leans gently toward the cursor, read from R3F's own pointer tracking
 * (no extra listeners or React state).
 */
function CaftonMark() {
  const groupRef = useRef<Group>(null);
  const facetRefs = useRef<(Mesh | null)[]>([]);
  const { theme } = useTheme();
  const color = theme === "dark" ? "#e5e5e5" : "#171717";

  const geometries = useMemo(() => buildFacetGeometries(), []);
  const seeds = useMemo<FacetSeed[]>(
    () => geometries.map(() => randomSeed()),
    [geometries]
  );

  // Damped pointer position, not React state -- read fresh each frame.
  const pointer = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const progress = useHeroScrollStore.getState().progress;
    // Remapped so the reveal itself finishes at REVEAL_END, not at the
    // very end of the hero's scroll distance -- see REVEAL_END comment.
    const revealProgress = Math.min(progress / REVEAL_END, 1);
    const eased = easeInOutCubic(revealProgress);
    const unresolved = 1 - eased;
    const t = state.clock.elapsedTime;

    pointer.current.x += (state.pointer.x - pointer.current.x) * Math.min(delta * 2.5, 1);
    pointer.current.y += (state.pointer.y - pointer.current.y) * Math.min(delta * 2.5, 1);

    // Settle rotation is driven by `eased` (0 -> 1 once, then holds),
    // not by elapsed time -- the old version added a continuous t*0.12
    // spin, which meant the mark's final facing direction was whatever
    // angle it happened to be at when the user stopped scrolling, i.e.
    // effectively random. That's what the owner saw as "facing left"
    // when it should read facing right: it wasn't consistently either,
    // it was unresolved. Now it deterministically settles at
    // REST_FACE_Y and stays there (plus a small idle sway) once resolved.
    const settleY = MathUtils.lerp(SCATTER_FACE_Y, REST_FACE_Y, eased);
    const idleSway = Math.sin(t * 0.25) * 0.05 * unresolved;
    const pointerInfluenceY = pointer.current.x * 0.2 * (1 - eased * 0.4);

    group.rotation.y = settleY + idleSway + pointerInfluenceY;
    group.rotation.x = -eased * Math.PI * 0.08 - pointer.current.y * 0.12 * (1 - eased * 0.3);
    group.position.y = BASE_Y;
    // Driven by `eased`, not raw `progress`: once the mark has resolved
    // it stops drifting for the rest of the (now much longer) hold
    // period, instead of continuing to creep toward the camera while
    // the owner is trying to read the CTA.
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
    <group ref={groupRef}>
      {geometries.map((geometry, i) => (
        <mesh
          key={i}
          ref={(el) => {
            facetRefs.current[i] = el;
          }}
          geometry={geometry}
        >
          <meshStandardMaterial
            color={color}
            flatShading
            roughness={0.4}
            metalness={0.05}
          />
        </mesh>
      ))}
    </group>
  );
}

export function HeroScene() {
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

  return (
    // Not pointer-events-none: R3F reads the pointer position straight off
    // this element for the cursor-tilt effect. Safe to leave interactive --
    // the headline/CTAs live in their own grid column now (see
    // home-hero.tsx), not stacked on top of this canvas, so there's no
    // click-target conflict either.
    <div className="absolute inset-0" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 9], fov: 36 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        performance={{ min: 0.5 }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 3]} intensity={0.9} />
        <directionalLight position={[-3, -2, 2]} intensity={0.3} />
        <CaftonMark />
      </Canvas>
    </div>
  );
}
