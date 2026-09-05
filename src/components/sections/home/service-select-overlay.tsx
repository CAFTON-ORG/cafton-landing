"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { services } from "@/lib/services";

/** Hold time on the picked tile before closing, so the pick reads as confirmed rather than instant. */
const CONFIRM_HOLD_MS = 420;

interface ServiceSelectOverlayProps {
  /** Called once the overlay has fully closed after a tile was picked. */
  onProceed: (projectType: string) => void;
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
  const chosenType = useRef<string | null>(null);

  const finish = () => {
    if (chosenType.current) onProceed(chosenType.current);
    else onSkip();
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // With no CSS close-animation to run under reduced motion, there is no
    // `animationend` to wait for -- resolve immediately instead of hanging.
    if (!next && reduceMotion) finish();
  };

  const handlePick = (title: string, projectType: string) => {
    if (pickedTitle) return;
    setPickedTitle(title);
    chosenType.current = projectType;
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
          className="fixed inset-0 z-90 flex flex-col items-center justify-center overflow-y-auto bg-background px-5 py-14 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:duration-300 data-[state=open]:duration-400"
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
            <Dialog.Description className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Choose one to continue
            </Dialog.Description>
            <Dialog.Title className="mb-8 max-w-2xl text-balance text-2xl font-black uppercase leading-[0.95] tracking-tight sm:mb-10 sm:text-4xl md:text-5xl">
              What service would you like to inquire?
            </Dialog.Title>

            <div className="grid w-full grid-cols-2 gap-2 sm:gap-4">
              {services.map((service, index) => {
                const isPicked = pickedTitle === service.title;
                const isOtherPicked = pickedTitle !== null && !isPicked;
                return (
                  <button
                    key={service.title}
                    type="button"
                    disabled={pickedTitle !== null}
                    onClick={() => handlePick(service.title, service.projectType)}
                    className={cn(
                      "group relative flex flex-col items-start gap-1 overflow-hidden rounded-lg border p-3 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default sm:gap-2 sm:rounded-xl sm:p-6",
                      isPicked
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:-translate-y-0.5 hover:border-foreground/50",
                      isOtherPicked && "opacity-30",
                    )}
                  >
                    {/* Corner brackets, a small nod to a game-UI selection reticle -- fades in on hover/focus. */}
                    {!isPicked && (
                      <>
                        <span className="pointer-events-none absolute left-2 top-2 size-3 border-l border-t border-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-60" />
                        <span className="pointer-events-none absolute right-2 top-2 size-3 border-r border-t border-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-60" />
                        <span className="pointer-events-none absolute bottom-2 left-2 size-3 border-b border-l border-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-60" />
                        <span className="pointer-events-none absolute bottom-2 right-2 size-3 border-b border-r border-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-60" />
                      </>
                    )}

                    <span
                      aria-hidden="true"
                      className={cn(
                        "text-[0.65rem] font-semibold tracking-[0.2em] sm:text-xs",
                        isPicked ? "text-background/70" : "text-muted-foreground",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <service.icon className="mt-1 size-5 sm:size-7" aria-hidden="true" />
                    <h3 className="text-sm font-semibold sm:text-lg">
                      {service.title}
                      {isPicked && (
                        <span className="ml-2 hidden align-middle text-xs font-semibold uppercase tracking-[0.2em] sm:inline">
                          Selected
                        </span>
                      )}
                    </h3>
                    <p
                      className={cn(
                        "hidden text-sm leading-6 sm:block",
                        isPicked ? "text-background/80" : "text-muted-foreground",
                      )}
                    >
                      {service.description}
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
