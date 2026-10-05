const HERO_READY_EVENT = "cafton:hero-ready";

let heroReady = false;

/** Called by the hero scene once its first 3D frame has been presented. */
export function markHeroReady() {
  if (heroReady) return;
  heroReady = true;
  window.dispatchEvent(new Event(HERO_READY_EVENT));
}

/**
 * Subscribes to the hero scene's first frame. Calls back immediately if it
 * has already happened, so a late subscriber can never miss it. Returns an
 * unsubscribe function.
 */
export function onHeroReady(callback: () => void): () => void {
  if (heroReady) {
    callback();
    return () => {};
  }
  window.addEventListener(HERO_READY_EVENT, callback, { once: true });
  return () => window.removeEventListener(HERO_READY_EVENT, callback);
}

/**
 * Called when the hero scene unmounts (navigating away from the homepage),
 * so that coming back is treated as a fresh load: the scene remounts, builds
 * a new WebGL context and has to draw its first frame again.
 */
export function resetHeroReady() {
  heroReady = false;
}
