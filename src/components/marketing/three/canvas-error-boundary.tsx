"use client";

import { Component, type ReactNode } from "react";

interface CanvasErrorBoundaryProps {
  children: ReactNode;
  /** Rendered instead of `children` once a render/commit error is caught. */
  fallback: ReactNode;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
}

/**
 * Guards a WebGL/Three.js subtree.
 *
 * WebGL context creation is not guaranteed to succeed -- it can fail on
 * real devices from GPU driver issues, memory pressure, a browser's
 * per-page/per-origin context budget already spent, or Low Power Mode
 * restricting GPU access -- and react-three-fiber's `Canvas` throws
 * when it does. Nothing in this app had a React error boundary
 * anywhere, so that throw had no boundary to stop at: React unmounts
 * up to the nearest one, and with none present that means everything
 * above it. That is the likely mechanism behind the hero and
 * Differentiators sections going fully blank (text included) on some
 * phones while the rest of the site kept working -- a WebGL failure
 * on one of those two Canvases taking out more than just the 3D layer.
 * This stops it at the Canvas itself.
 */
export class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  state: CanvasErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("3D scene failed, falling back:", error);
    }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
