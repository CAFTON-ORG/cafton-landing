/**
 * Cookie consent record, kept in one first-party cookie.
 *
 * Only categories that need consent appear here. Strictly necessary cookies
 * and storage (this consent cookie itself, the security check on the contact
 * form, the saved light/dark preference) are always on and need no choice.
 * The site runs no analytics or advertising cookies; the one optional category
 * is third-party embedded content such as the Gleam giveaway form.
 */
export const CONSENT_COOKIE = "cafton_consent";

/** Bump when categories or their meaning change, so visitors are asked again. */
export const CONSENT_VERSION = 1;

/** Six months: well inside the 12-month ceiling regulators treat as reasonable, and long enough not to nag. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export interface ConsentChoices {
  /** Third-party embedded content (Gleam), which sets its own cookies. */
  embeds: boolean;
}

export interface ConsentRecord extends ConsentChoices {
  version: number;
  /** ISO timestamp of the choice, kept as the record of when consent was given or withdrawn. */
  savedAt: string;
}

export const REJECT_ALL: ConsentChoices = { embeds: false };
export const ACCEPT_ALL: ConsentChoices = { embeds: true };

export function parseConsent(raw: string | undefined): ConsentRecord | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentRecord>;
    if (
      value.version !== CONSENT_VERSION ||
      typeof value.embeds !== "boolean" ||
      typeof value.savedAt !== "string"
    ) {
      return null;
    }
    return { version: value.version, embeds: value.embeds, savedAt: value.savedAt };
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();

/** For `useSyncExternalStore`: re-render subscribers when the choice changes. */
export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The raw cookie value (or ""), as a primitive so it compares stably. Browser only. */
export function getConsentSnapshot(): string {
  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`));
  return entry?.slice(CONSENT_COOKIE.length + 1) ?? "";
}

/** Stores a choice and returns the record that was written. Browser only. */
export function writeConsent(choices: ConsentChoices): ConsentRecord {
  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    embeds: choices.embeds,
    savedAt: new Date().toISOString(),
  };
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(record))}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  listeners.forEach((listener) => listener());
  return record;
}
