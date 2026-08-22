"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type TurnstileOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileOptions) => string;
      remove: (widgetId: string) => void;
    };
  }
}

type TurnstileProps = { onTokenChange: (token: string | null) => void };

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function Turnstile({ onTokenChange }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!siteKey || !containerRef.current || widgetIdRef.current) return;

    const render = () => {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current)
        return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onTokenChange(token),
        "expired-callback": () => onTokenChange(null),
        "error-callback": () => {
          onTokenChange(null);
          setLoadError(true);
        },
      });
    };

    render();
    const interval = window.setInterval(render, 100);
    return () => {
      window.clearInterval(interval);
      if (widgetIdRef.current && window.turnstile)
        window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = undefined;
    };
  }, [onTokenChange]);

  if (!siteKey) {
    return (
      <p className="text-sm text-destructive" role="alert">
        This form is temporarily unavailable. Please email us directly.
      </p>
    );
  }

  return (
    <div>
      <Script
        id="cloudflare-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onError={() => setLoadError(true)}
      />
      <div ref={containerRef} />
      {loadError && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          Security verification could not load. Please refresh and try again.
        </p>
      )}
    </div>
  );
}
