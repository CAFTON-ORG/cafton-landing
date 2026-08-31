"use client";

import { useEffect, useRef, type RefObject } from "react";
import { FRAME_COUNT, framePath } from "@/lib/differentiators-video";

/** Matches the 3D canvases' dpr ceiling -- past this it's cost with no payoff. */
const MAX_DPR = 1.5;

interface ScrollScrubVideoProps {
  /** Raw 0-1 scroll progress across the section, updated by the parent's
   *  own ScrollTrigger. Read per-frame in a rAF loop rather than passed as
   *  a changing prop, so nothing pushes 60fps updates through React --
   *  same pattern as DifferentiatorsMark. */
  progressRef: RefObject<number>;
  className?: string;
}

/**
 * Footage whose playhead is the scroll position, drawn as a frame sequence
 * on a canvas rather than seeked on a `<video>`.
 *
 * A video element was the obvious way to do this and it stutters: seeking
 * is asynchronous and rate-limited by the browser, so a scrub issues far
 * more seeks than it can retire and the picture lags behind the scroll.
 * Pre-decoded frames have no seek at all -- each scroll frame is one
 * `drawImage` of an image already in memory, which is why scroll-scrubbed
 * footage is built this way.
 *
 * Frames carry their grade baked in (see the ffmpeg step that produced
 * them), so there is no CSS filter re-running over the surface either.
 */
export function ScrollScrubVideo({
  progressRef,
  className,
}: ScrollScrubVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    const ctx = context;

    const frames: HTMLImageElement[] = [];
    const ready: boolean[] = new Array(FRAME_COUNT).fill(false);

    let raf = 0;
    let running = false;
    let drawnIndex = -1;

    const drawCover = (image: HTMLImageElement) => {
      const { width, height } = canvas;
      if (!width || !height || !image.naturalWidth) return;
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
    };

    // Until every frame has arrived, fall back to the nearest one that has --
    // the sequence sharpens as it loads instead of showing gaps.
    const nearestLoaded = (index: number) => {
      if (ready[index]) return index;
      for (let offset = 1; offset < FRAME_COUNT; offset += 1) {
        if (index - offset >= 0 && ready[index - offset]) return index - offset;
        if (index + offset < FRAME_COUNT && ready[index + offset]) return index + offset;
      }
      return -1;
    };

    const render = (force = false) => {
      const progress = Math.min(1, Math.max(0, progressRef.current));
      const wanted = Math.round(progress * (FRAME_COUNT - 1));
      const index = nearestLoaded(wanted);
      if (index < 0) return;
      if (!force && index === drawnIndex) return;
      drawnIndex = index;
      drawCover(frames[index]);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      render(true);
    };

    for (let i = 0; i < FRAME_COUNT; i += 1) {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        ready[i] = true;
        // First frame in wins the initial paint; later ones only redraw if
        // they're the frame the current scroll position actually wants.
        if (drawnIndex < 0) render(true);
      };
      image.src = framePath(i);
      frames.push(image);
    }

    const tick = () => {
      raf = requestAnimationFrame(tick);
      render();
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // Nothing to redraw for a section nobody is looking at; same 400px
    // buffer the 3D canvases use, so it's warm before it scrolls in.
    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: "400px 0px" }
    );
    observer.observe(canvas);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      stop();
      frames.forEach((image) => {
        image.onload = null;
      });
    };
  }, [progressRef]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
