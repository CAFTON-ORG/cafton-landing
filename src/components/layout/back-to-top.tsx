"use client";

import { ArrowUp } from "lucide-react";
import { scrollToTop } from "@/components/providers/smooth-scroll";

export function BackToTop() {
  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="group inline-flex cursor-pointer items-center gap-2 rounded-full py-1 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      Back to top
      <ArrowUp
        className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </button>
  );
}
