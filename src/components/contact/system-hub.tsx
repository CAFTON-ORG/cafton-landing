"use client";

import dynamic from "next/dynamic";
import { CanvasErrorBoundary } from "@/components/three/canvas-error-boundary";
import { useCanShow3D } from "@/hooks/use-can-show-3d";
import { Logo } from "@/components/shared/logo";

const ContactMark = dynamic(
  () => import("@/components/three/contact-mark").then((mod) => mod.ContactMark),
  { ssr: false },
);

/** Flat fallback for reduced-motion/no-WebGL visitors and the error boundary. */
function StaticHub() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Logo className="h-2/3 w-auto text-foreground" aria-hidden="true" />
    </div>
  );
}

/** The 3D Cafton mark, sized to sit at the center of the contact page's system graphic. */
export function SystemHub() {
  const canShow3D = useCanShow3D();

  if (!canShow3D) return <StaticHub />;

  return (
    <CanvasErrorBoundary fallback={<StaticHub />}>
      <ContactMark />
    </CanvasErrorBoundary>
  );
}
