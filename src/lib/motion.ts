/* Shared motion system — the same values as the CSS variables in index.css (--dur-*, --ease-*). */

export const DUR = { fast: 180, base: 420, slow: 900, cinema: 1600 } as const;
export const EASE_CSS = {
  outExpo: "cubic-bezier(.16,1,.3,1)",
  inOutSoft: "cubic-bezier(.65,0,.35,1)",
} as const;

/** CSS-compatible cubic-bezier easing for JS-driven motion (count-ups, counters, 3D). */
export function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number): (x: number) => number {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const e = sx(t) - x;
      const d = dx(t);
      if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    if (t < 0 || t > 1 || Math.abs(sx(t) - x) > 1e-4) {
      let lo = 0;
      let hi = 1;
      t = x;
      for (let i = 0; i < 24; i++) {
        const v = sx(t);
        if (Math.abs(v - x) < 1e-5) break;
        if (v < x) lo = t;
        else hi = t;
        t = (lo + hi) / 2;
      }
    }
    return sy(t);
  };
}

export const easeOutExpo = cubicBezier(0.16, 1, 0.3, 1);
export const easeInOutSoft = cubicBezier(0.65, 0, 0.35, 1);
