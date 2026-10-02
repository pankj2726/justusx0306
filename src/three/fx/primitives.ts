/* =========================================================================
   src/three/fx/primitives.ts — sparkle-formation primitives.

   Pure, seeded shape generators. Each one calls `emit(x, y, z, k, info)` for
   every point instead of allocating, so callers decide where points go
   (build-time cloud or a pre-allocated Float32Array). Nothing here uses
   Math.random(): pass an rng from rngFor(...) for deterministic layout.
   ========================================================================= */

export type Emit = (x: number, y: number, z: number, k: number, info: number) => void;

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Tier-scaled point count. */
export const scaled = (n: number, mult: number) => Math.max(0, Math.round(n * mult));

/** Fibonacci-sphere shell. info = latitude (-1 … 1). */
export function sphereShell(n: number, radius: number, rng: () => number, emit: Emit, opts: { thickness?: number; limbBias?: number } = {}) {
  const rot = rng() * Math.PI * 2;
  const th = opts.thickness ?? 0.04;
  for (let k = 0; k < n; k++) {
    const y = Math.max(-1, Math.min(1, 1 - ((k + 0.5) / n) * 2 + (rng() - 0.5) / n));
    const rr = Math.sqrt(1 - y * y);
    const a = k * GOLDEN + rot + (rng() - 0.5) * 0.3;
    let rad = radius * (1 + (rng() - 0.5) * th);
    // a few points scattered just outside the surface read as a denser silhouette
    if (opts.limbBias) rad *= 1 + opts.limbBias * Math.pow(rng(), 3) * 0.08;
    emit(Math.cos(a) * rr * rad, y * rad, Math.sin(a) * rr * rad, k, y);
  }
}

export type RingBand = { rIn: number; rOut: number; density: number };

/** Flat annulus (XZ plane) made of one or more bands, with optional Cassini-style gaps. info = band index. */
export function ringDisc(n: number, bands: RingBand[], rng: () => number, emit: Emit, opts: { gaps?: number[]; gapWidth?: number; thickness?: number } = {}) {
  const w = bands.map((b) => b.density * (b.rOut * b.rOut - b.rIn * b.rIn));
  const total = w.reduce((s, x) => s + x, 0) || 1;
  const gw = opts.gapWidth ?? 0;
  for (let k = 0; k < n; k++) {
    let pick = rng() * total;
    let bi = 0;
    while (bi < w.length - 1 && pick > w[bi]) pick -= w[bi++];
    const b = bands[bi];
    let r = Math.sqrt(b.rIn * b.rIn + rng() * (b.rOut * b.rOut - b.rIn * b.rIn));
    if (opts.gaps && gw > 0) {
      for (let tries = 0; tries < 3 && opts.gaps.some((g) => Math.abs(r - g) < gw); tries++) {
        r = Math.sqrt(b.rIn * b.rIn + rng() * (b.rOut * b.rOut - b.rIn * b.rIn));
      }
    }
    const a = rng() * Math.PI * 2;
    const y = (rng() - 0.5) * (opts.thickness ?? 0.02) * r;
    emit(Math.cos(a) * r, y, Math.sin(a) * r, k, bi);
  }
}

/** Flattened lens + small dome + rim lights. info: 0 lens, 1 dome, 2 rim light. */
export function saucer(n: number, radius: number, rng: () => number, emit: Emit, lights = 10) {
  const dome = Math.round(n * 0.2);
  const lens = Math.max(0, n - dome);
  for (let k = 0; k < lens; k++) {
    const u = rng() * Math.PI * 2;
    const v = Math.acos(2 * rng() - 1);
    emit(Math.sin(v) * Math.cos(u) * radius, Math.cos(v) * radius * 0.22, Math.sin(v) * Math.sin(u) * radius, k, 0);
  }
  for (let k = 0; k < dome; k++) {
    const u = rng() * Math.PI * 2;
    const v = Math.acos(rng()); // upper hemisphere
    const r = radius * 0.38;
    emit(Math.sin(v) * Math.cos(u) * r, radius * 0.12 + Math.cos(v) * r, Math.sin(v) * Math.sin(u) * r, lens + k, 1);
  }
  for (let k = 0; k < lights; k++) {
    const a = (k / lights) * Math.PI * 2;
    emit(Math.cos(a) * radius * 1.02, 0, Math.sin(a) * radius * 1.02, lens + dome + k, 2);
  }
}

/** Unit-size parametric heart (XY plane), centred. */
export function heartPoint(t: number): [number, number] {
  const s = Math.sin(t);
  const x = 16 * s * s * s;
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return [x / 17, (y + 2.5) / 17];
}

/** Heart curve in the XY plane. fill 0 = outline only, 1 = filled. */
export function heartCurve(n: number, scale: number, rng: () => number, emit: Emit, opts: { fill?: number; jitter?: number; depth?: number } = {}) {
  const fill = opts.fill ?? 0;
  const j = opts.jitter ?? 0.02;
  const depth = opts.depth ?? 0.05;
  for (let k = 0; k < n; k++) {
    const t = ((k + rng() * 0.6) / n) * Math.PI * 2;
    let [x, y] = heartPoint(t);
    if (rng() < fill) {
      const s = Math.sqrt(rng());
      x *= s;
      y *= s;
    }
    x += (rng() - 0.5) * j * 2;
    y += (rng() - 0.5) * j * 2;
    emit(x * scale, y * scale, (rng() - 0.5) * depth * scale, k, 0);
  }
}

/** Torus-like dust belt (XZ plane). */
export function orbitBelt(n: number, rMean: number, rWidth: number, rng: () => number, emit: Emit, thickness = 0.12) {
  for (let k = 0; k < n; k++) {
    const a = rng() * Math.PI * 2;
    const r = rMean + (rng() + rng() - 1) * rWidth;
    const y = (rng() + rng() - 1) * thickness * rWidth;
    emit(Math.cos(a) * r, y, Math.sin(a) * r, k, 0);
  }
}

/** Ring buffer of points that fade with age (wakes, trails). */
export class RingTrail {
  readonly n: number;
  readonly pos: Float32Array;
  readonly birth: Float32Array;
  private head = 0;
  constructor(n: number) {
    this.n = n;
    this.pos = new Float32Array(n * 3);
    this.birth = new Float32Array(n).fill(-1e9);
  }
  push(x: number, y: number, z: number, t: number) {
    const i = this.head;
    this.head = (i + 1) % this.n;
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = y;
    this.pos[i * 3 + 2] = z;
    this.birth[i] = t;
  }
  alpha(i: number, t: number, life: number) {
    const age = t - this.birth[i];
    return age < 0 || age > life ? 0 : 1 - age / life;
  }
  clear() {
    this.birth.fill(-1e9);
  }
}

export type BinaryPair = { r1: number; r2: number; e: number; period: number; phase: number; sep: number; tilt: number; node: number };

/** Two bodies around a shared barycentre (radii are fractions of a chapter planet). */
export function binaryPair(rng: () => number): BinaryPair {
  return {
    r1: 0.55,
    r2: 0.5,
    e: 0.28 + rng() * 0.12,
    period: 84 + rng() * 12,
    phase: rng() * Math.PI * 2,
    sep: 3.1 + rng() * 0.5,
    tilt: 0.22 + rng() * 0.3,
    node: rng() * Math.PI * 2,
  };
}
