"use client";

import { useEffect, useRef } from "react";

const GLEAM_SCRIPT_SRC = "https://widget.gleamjs.io/e.js";

interface GleamWidgetProps {
  /** Public campaign URL, e.g. https://gleam.io/V6Dp2/cafton-merch-giveaway */
  campaignUrl: string;
  /** Link text, also shown if the widget script is blocked. */
  title: string;
}

/**
 * Gleam's `e.js` scans the page once, when it executes, for `.e-widget`
 * links and swaps each for the embed. In a Next.js app that breaks two ways
 * with the plain snippet: React owns the DOM, and client-side navigation
 * never re-executes a script that already ran (`next/script` also loads a
 * given `src` only once per session), so returning to /events would show a
 * bare link. Gleam's own guidance for dynamic pages is to insert the anchor
 * and a fresh script tag together, so that is done here on every mount.
 *
 * The anchor is created imperatively inside a container React never renders
 * children into, because Gleam replaces it with an iframe -- a node React
 * would otherwise try (and fail) to reconcile on unmount.
 */
export function GleamWidget({ campaignUrl, title }: GleamWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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
  }, [campaignUrl, title]);

  return <div ref={containerRef} className="min-h-80 w-full" />;
}
