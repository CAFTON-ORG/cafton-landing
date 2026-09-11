"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageSkeleton } from "@/components/shared/image-skeleton";

export function TeamPhoto() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="group relative h-full w-full overflow-hidden rounded-xl border">
      {!loaded && <ImageSkeleton />}
      <Image
        src="/cafton-team.png"
        alt="The Cafton team"
        fill
        sizes="(min-width: 1024px) 40vw, 100vw"
        priority
        onLoad={() => setLoaded(true)}
        className={`object-cover grayscale transition-all duration-500 group-hover:grayscale-0 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
