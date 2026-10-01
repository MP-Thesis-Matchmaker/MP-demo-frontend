// The landing video's motion curves, for code that animates outside CSS (DotField's canvas). The same three
// exist as CSS custom properties in theme/themis.scss: --themis-ease-enter / -draw / -settle.

export type Easing = (t: number) => number;

/** Things arriving: fast start, soft landing. */
export const easeOutCubic: Easing = t => 1 - (1 - t) ** 3;

/** Lines and fades. */
export const easeInOutCubic: Easing = t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

/** Things moving to a new place: a slow lift-off, a long glide, a slow set-down. */
export const easeInOutQuart: Easing = t => t < .5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, p: number): number {
  return a + (b - a) * p;
}

/** Progress of `now` through [start, start + duration], eased and clamped to 0..1. */
export function progress(now: number, start: number, duration: number, ease: Easing = t => t): number {
  return duration <= 0 ? (now >= start ? 1 : 0) : ease(clamp((now - start) / duration, 0, 1));
}

/** mulberry32: a tiny seeded generator, so a field looks the same on every visit and specs are deterministic. */
export function seededRandom(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
