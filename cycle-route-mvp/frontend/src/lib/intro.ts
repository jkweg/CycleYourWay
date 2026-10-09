// First-run intro: the full loading animation plays once per device; later visits
// get only a thin route bar. Other components wait for the intro before animating.
const INTRO_KEY = 'cyw:intro-seen'
const INTRO_DONE_EVENT = 'cyw:intro-done'

declare global {
  interface Window {
    __cywIntroDone?: boolean
  }
}

export function hasSeenIntro(): boolean {
  try {
    return window.localStorage.getItem(INTRO_KEY) === '1'
  } catch {
    // Storage blocked (private mode): don't replay the intro on every load.
    return true
  }
}

export function markIntroSeen(): void {
  try {
    window.localStorage.setItem(INTRO_KEY, '1')
  } catch {
    // ignore
  }
}

export function signalIntroDone(): void {
  if (window.__cywIntroDone) return
  window.__cywIntroDone = true
  window.dispatchEvent(new Event(INTRO_DONE_EVENT))
}

/** Runs `callback` once the intro is gone (immediately if it already is). */
export function onIntroDone(callback: () => void): () => void {
  if (window.__cywIntroDone) {
    callback()
    return () => undefined
  }
  const handler = () => callback()
  window.addEventListener(INTRO_DONE_EVENT, handler, { once: true })
  return () => window.removeEventListener(INTRO_DONE_EVENT, handler)
}

export function prefersReducedMotion(): boolean {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}
