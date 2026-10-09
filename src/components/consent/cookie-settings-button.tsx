"use client";

import { useConsent } from "@/components/consent/consent-provider";

/** Reopens the cookie preferences. Withdrawing consent must be as easy as giving it, so this sits in the footer of every page. */
export function CookieSettingsButton({ className }: { className?: string }) {
  const { openPreferences } = useConsent();

  return (
    <button type="button" onClick={openPreferences} className={className}>
      Cookie settings
    </button>
  );
}
