"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { servicePillars } from "@/lib/services";
import { CornerBrackets } from "@/components/shared/corner-brackets";

/** Hold time on the picked tile before closing, so the pick reads as confirmed rather than instant. */
const CONFIRM_HOLD_MS = 420;

interface ServiceSelectOverlayProps {
  /** Called once the overlay has fully closed after a pillar was picked, with that pillar's slug. */
  onProceed: (categorySlug: string) => void;
  /** Called once the overlay has fully closed via Esc, the backdrop, the close button, or "Skip". */
  onSkip: () => void;
}

/**
 * Full-screen "which service?" step shown after the hero mark finishes
 * building, before handing off to the contact form. Built on Radix's
 * Dialog primitive (same one `sheet.tsx` wraps) for real focus-trap/Esc/
 * scroll-lock behaviour rather than a hand-rolled overlay, styled as its
 * own full-bleed screen instead of a floating panel.
 */
export function ServiceSelectOverlay({ onProceed, onSkip }: ServiceSelectOverlayProps) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(true);
  const [pickedTitle, setPickedTitle] = useState<string | null>(null);
  const chosenSlug = useRef<string | null>(null);

  const finish = () => {
    if (chosenSlug.current) onProceed(chosenSlug.current);
    else onSkip();
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // With no CSS close-animation to run under reduced motion, there is no
    // `animationend` to wait for -- resolve immediately instead of hanging.
    if (!next && reduceMotion) finish();
  };

  const handlePick = (title: string, slug: string) => {
    if (pickedTitle) return;
    setPickedTitle(title);
    chosenSlug.current = slug;
    if (reduceMotion) {
      handleOpenChange(false);
      return;
    }
    window.setTimeout(() => handleOpenChange(false), CONFIRM_HOLD_MS);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-90 bg-background/95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          onAnimationEnd={(event) => {
            if (event.target !== event.currentTarget) return;
            if (!open) finish();
          }}
          className="fixed inset-0 z-90 flex flex-col items-center justify-center overflow-y-auto bg-background px-4 py-8 focus:outline-none sm:px-5 sm:py-14 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:duration-300 data-[state=open]:duration-400"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_70%_60%_at_50%_35%,color-mix(in_oklch,var(--foreground)_8%,transparent)_0%,transparent_60%)]"
          />

          <Dialog.Close className="absolute right-5 top-5 cursor-pointer rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </Dialog.Close>

          <div className="relative flex w-full max-w-3xl flex-col items-center text-center">
            <Dialog.Description className="mb-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground sm:mb-2">
              Choose one to continue
            </Dialog.Description>
            <Dialog.Title className="mb-5 max-w-2xl text-balance text-xl font-black uppercase leading-[0.95] tracking-tight sm:mb-10 sm:text-4xl md:text-5xl">
              What are you looking to build?
            </Dialog.Title>

            <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4">
              {servicePillars.map((pillar, index) => {
                const isPicked = pickedTitle === pillar.title;
                const isOtherPicked = pickedTitle !== null && !isPicked;
                return (
                  <button
                    key={pillar.title}
                    type="button"
                    disabled={pickedTitle !== null}
                    onClick={() => handlePick(pillar.title, pillar.slug)}
                    className={cn(
                      "group relative flex flex-col items-start gap-1.5 overflow-hidden rounded-xl border p-4 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default sm:gap-2 sm:p-6",
                      isPicked
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:-translate-y-0.5 hover:border-foreground/50",
                      isOtherPicked && "opacity-30",
                    )}
                  >
                    {!isPicked && <CornerBrackets />}

                    <span
                      aria-hidden="true"
                      className={cn(
                        "text-xs font-semibold tracking-[0.2em]",
                        isPicked ? "text-background/70" : "text-muted-foreground",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <pillar.icon className="mt-1 size-6 sm:size-7" aria-hidden="true" />
                    <h3 className="text-lg font-semibold">
                      {pillar.title}
                      {isPicked && (
                        <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-[0.2em]">
                          Selected
                        </span>
                      )}
                    </h3>
                    <p
                      className={cn(
                        "text-sm leading-5 sm:leading-6",
                        isPicked ? "text-background/80" : "text-muted-foreground",
                      )}
                    >
                      {pillar.tagline}
                    </p>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="mt-6 cursor-pointer text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline sm:mt-10"
            >
              Skip -- I&apos;ll fill this in myself
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
