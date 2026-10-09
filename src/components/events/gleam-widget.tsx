"use client";

import { useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConsent } from "@/components/consent/consent-provider";

const GLEAM_SCRIPT_SRC = "https://widget.gleamjs.io/e.js";

interface GleamWidgetProps {
  /** Public campaign URL, e.g. https://gleam.io/V6Dp2/cafton-merch-giveaway */
  campaignUrl: string;
  /** Link text, also shown if the widget script is blocked. */
  title: string;
}

/**
 * Gleam's embed is third-party content that sets its own cookies, so it only
 * loads once the visitor has allowed embedded content (click-to-load): until
 * then a placeholder explains why and offers both the one-click opt-in and a
 * plain link to the giveaway on Gleam itself, which needs no consent here.
 *
 * Once allowed: Gleam's `e.js` scans the page once, when it executes, for
 * `.e-widget` links and swaps each for the embed. In a Next.js app that breaks
 * two ways with the plain snippet: React owns the DOM, and client-side
 * navigation never re-executes a script that already ran (`next/script` also
 * loads a given `src` only once per session), so returning to /events would
 * show a bare link. Gleam's own guidance for dynamic pages is to insert the
 * anchor and a fresh script tag together, so that is done here on every
 * mount. The anchor is created imperatively inside a container React never
 * renders children into, because Gleam replaces it with an iframe -- a node
 * React would otherwise try (and fail) to reconcile on unmount.
 */
export function GleamWidget({ campaignUrl, title }: GleamWidgetProps) {
  const { ready, consent, save } = useConsent();
  const allowed = consent?.embeds === true;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!allowed || !container) return;

    const anchor = document.createElement("a");
    anchor.className = "e-widget no-button";
    anchor.href = campaignUrl;
    anchor.rel = "nofollow";
    anchor.textContent = title;
    container.appendChild(anchor);

    const script = document.createElement("script");
    script.src = GLEAM_SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
      container.replaceChildren();
    };
  }, [allowed, campaignUrl, title]);

  if (allowed) return <div ref={containerRef} className="min-h-80 w-full" />;

  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-5 rounded-xl border border-dashed p-8 text-center">
      <p className="max-w-md text-muted-foreground">
        The entry form is provided by Gleam, which sets its own cookies. It
        loads only if you allow embedded content.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          className="cursor-pointer"
          disabled={!ready}
          onClick={() => save({ embeds: true })}
        >
          Allow and load the form
        </Button>
        <Button asChild variant="outline" className="cursor-pointer">
          <a href={campaignUrl} target="_blank" rel="noopener noreferrer">
            Open on Gleam
            <ExternalLink className="ms-2 size-4" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </div>
  );
}
