"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { CookieBanner } from "@/components/consent/cookie-banner";
import { CookiePreferences } from "@/components/consent/cookie-preferences";
import {
  ACCEPT_ALL,
  REJECT_ALL,
  getConsentSnapshot,
  parseConsent,
  subscribeConsent,
  writeConsent,
  type ConsentChoices,
  type ConsentRecord,
} from "@/lib/consent";

interface ConsentContextValue {
  /** `false` until the cookie has been read, so nothing flashes or loads too early. */
  ready: boolean;
  /** The saved choice, or `null` if the visitor hasn't made one (or it is out of date). */
  consent: ConsentRecord | null;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  save: (choices: ConsentChoices) => void;
  acceptAll: () => void;
  rejectAll: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function useConsent(): ConsentContextValue {
  const value = useContext(ConsentContext);
  if (!value) throw new Error("useConsent must be used inside <ConsentProvider>");
  return value;
}

/**
 * Holds the visitor's cookie choice and renders the notice and the preference
 * dialog. Nothing optional is loaded until a choice says so: consumers read
 * `consent?.embeds` and render a placeholder otherwise.
 */
export function ConsentProvider({ children }: { children: ReactNode }) {
  // The cookie only exists in the browser: the server snapshot is `null`
  // (not ready), the client snapshot is the cookie's value, so the first
  // client render still matches the server's.
  const raw = useSyncExternalStore(subscribeConsent, getConsentSnapshot, () => null);
  const ready = raw !== null;
  const consent = useMemo(() => parseConsent(raw || undefined), [raw]);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Keep the pre-paint marker (see the root layout) in step with the choice, so
  // an outdated or cleared cookie brings the notice back.
  useEffect(() => {
    if (!ready) return; // still hydrating: leave the server-side state alone
    document.documentElement.toggleAttribute("data-consent", consent !== null);
  }, [ready, consent]);

  const save = useCallback((choices: ConsentChoices) => {
    writeConsent(choices);
    setPreferencesOpen(false);
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      ready,
      consent,
      preferencesOpen,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
      save,
      acceptAll: () => save(ACCEPT_ALL),
      rejectAll: () => save(REJECT_ALL),
    }),
    [ready, consent, preferencesOpen, save],
  );

  return (
    <ConsentContext.Provider value={value}>
      {children}
      <CookieBanner />
      <CookiePreferences />
    </ConsentContext.Provider>
  );
}
