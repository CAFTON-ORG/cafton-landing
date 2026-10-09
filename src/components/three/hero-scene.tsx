"use client";

import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { CaftonMark } from "@/components/three/cafton-mark";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { useWebglContextRecovery } from "@/hooks/use-webgl-context-recovery";
import { resetHeroReady } from "@/lib/hero-ready";

function SceneLighting({ isDark }: { isDark: boolean }) {
  return (
    <>
      <ambientLight intensity={isDark ? 0.6 : 0.95} />
      <directionalLight position={[3, 3, 3]} intensity={isDark ? 0.9 : 1.7} />
      <directionalLight position={[-3, -2, 2]} intensity={isDark ? 0.3 : 0.55} />
    </>
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

/** Draws a frame when the hero scrolls back into view (the loop is on demand). */
function WakeOnActive({ active }: { active: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (active) invalidate();
  }, [active, invalidate]);
  return null;
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
        dpr={[1, 1.25]}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        frameloop={active ? "demand" : "never"}
        onCreated={handleCreated}
        // Reserves vertical pan for page scroll; horizontal drag on the
        // mark still reaches the pointer handlers instead of being
        // swallowed by the browser's default touch scrolling.
        style={{ touchAction: "pan-y" }}
      >
        <WakeOnActive active={active} />
        <SceneLighting isDark={isDark} />
        <CaftonMark isDark={isDark} onBuildStart={onBuildStart} onBuildComplete={onBuildComplete} />
      </Canvas>
    </div>
  );
}
