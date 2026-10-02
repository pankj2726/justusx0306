/* =========================================================================
   src/three/fx/effects.ts — ambient life made of the one sparkle element.

   ShootingStars (falling stars + golden wish stars + meteor showers)
   · Fireflies · PointerTrail
   All buffers are pre-allocated; update() never allocates.
   Math.random() is used ONLY for transient timing/direction of streaks and
   trail jitter — never for the placement of any memory, world or strand.
   ========================================================================= */

import * as THREE from "three";
import type { SparkUniforms } from "../sparkleHD";

export type Mk = (twinkle: number) => { mat: THREE.ShaderMaterial; u: SparkUniforms };
export type Track = (d: { dispose: () => void }) => void;

const WHITE = new THREE.Color("#fff6ff");
const GOLD = new THREE.Color("#ffc46b");
const TRAIL = [new THREE.Color("#ffc46b"), new THREE.Color("#ff9ee8"), new THREE.Color("#6ff2ff")];

type Buffers = {
  g: THREE.BufferGeometry;
  pos: Float32Array;
  col: Float32Array;
  size: Float32Array;
  alpha: Float32Array;
};

function buffers(n: number, phaseOf: (i: number) => number, speed: number): Buffers {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const alpha = new Float32Array(n);
  const phase = new Float32Array(n);
  const spd = new Float32Array(n).fill(speed);
  for (let i = 0; i < n; i++) phase[i] = phaseOf(i);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  g.setAttribute("aSpeed", new THREE.BufferAttribute(spd, 1));
  return { g, pos, col, size, alpha };
}

function mount(parent: THREE.Object3D, mk: Mk, track: Track, b: Buffers, tw: number) {
  const m = mk(tw);
  const pts = new THREE.Points(b.g, m.mat);
  pts.frustumCulled = false;
  parent.add(pts);
  track(b.g);
  track(m.mat);
  return pts;
}

function flag(g: THREE.BufferGeometry, name: string) {
  (g.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
}

/* ------------------------------------------------------ shooting stars -- */

type Streak = {
  on: boolean;
  t0: number;
  life: number;
  s: THREE.Vector3;
  d: THREE.Vector3;
  bend: THREE.Vector3;
  len: number;
  gold: boolean;
  fade: number;
  head: THREE.Vector3;
};

export type StreakOptions = {
  /** buffer slots (≥ maxActive; extra slots are used by meteor showers) */
  slots: number;
  /** simultaneous streaks for normal cadence */
  maxActive: number;
  palette: { p: THREE.Vector3; c: THREE.Color }[];
  every: readonly [number, number];
  life: readonly [number, number];
  now: number;
  /** returns false for positions that must never host a streak (the void) */
  validate?: (x: number, y: number, z: number) => boolean;
};

export class ShootingStars {
  private b: Buffers;
  private readonly segs = 24;
  private slots: Streak[] = [];
  private next: number;
  private maxActive: number;
  private palette: { p: THREE.Vector3; c: THREE.Color }[];
  private every: readonly [number, number];
  private life: readonly [number, number];
  private validate?: (x: number, y: number, z: number) => boolean;
  private goldChance = 0;
  private queue: number[] = [];
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();

  constructor(parent: THREE.Object3D, mk: Mk, track: Track, o: StreakOptions) {
    const slots = Math.max(1, o.slots, o.maxActive);
    this.maxActive = o.maxActive;
    this.palette = o.palette;
    this.every = o.every;
    this.life = o.life;
    this.validate = o.validate;
    this.b = buffers(slots * this.segs, (i) => i * 0.37, 3);
    mount(parent, mk, track, this.b, 0.4);
    for (let i = 0; i < slots; i++) {
      this.slots.push({ on: false, t0: 0, life: 1, s: new THREE.Vector3(), d: new THREE.Vector3(), bend: new THREE.Vector3(), len: 30, gold: false, fade: 1, head: new THREE.Vector3() });
    }
    this.next = o.now + 8 + Math.random() * (o.every[1] - o.every[0]);
  }

  setCadence(every: readonly [number, number], life: readonly [number, number], now: number) {
    const changed = every[0] !== this.every[0] || every[1] !== this.every[1];
    this.every = every;
    this.life = life;
    if (changed) this.next = Math.min(this.next, now + every[0] + Math.random() * (every[1] - every[0]));
  }

  setGoldChance(c: number) {
    this.goldChance = Math.max(0, Math.min(1, c));
  }

  setMaxActive(n: number) {
    this.maxActive = Math.max(0, Math.min(n, this.slots.length));
  }

  /** Meteor shower: `count` streaks spread over `span` seconds starting at `start`. */
  shower(count: number, span: number, start: number) {
    for (let i = 0; i < count; i++) this.queue.push(start + (i / Math.max(1, count - 1)) * span + Math.random() * 0.8);
    this.queue.sort((a, b) => a - b);
  }

  private ok(x: number, y: number, z: number) {
    return !this.validate || this.validate(x, y, z);
  }

  private spawn(now: number, force: boolean) {
    let active = 0;
    let si = -1;
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].on) active++;
      else if (si < 0) si = i;
    }
    if (si < 0 || (!force && active >= this.maxActive)) return;
    const slot = this.slots[si];
    // reroll until start, middle and end are all outside the void
    for (let tries = 0; tries < 8; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r = 60 + Math.random() * 70;
      slot.s.set(Math.cos(a) * r, 34 + Math.random() * 36, Math.sin(a) * r);
      const sgn = Math.random() < 0.5 ? -1 : 1;
      slot.d.set(-Math.sin(a) * sgn, -0.42 - Math.random() * 0.2, Math.cos(a) * sgn).normalize();
      slot.len = 26 + Math.random() * 16;
      slot.bend.crossVectors(slot.d, this.tmp.set(0, 1, 0)).normalize().multiplyScalar((Math.random() - 0.5) * 0.12);
      const e = this.tmp2.copy(slot.s).addScaledVector(slot.d, slot.len).addScaledVector(slot.bend, slot.len);
      const mx = (slot.s.x + e.x) / 2;
      const my = (slot.s.y + e.y) / 2;
      const mz = (slot.s.z + e.z) / 2;
      if (this.ok(slot.s.x, slot.s.y, slot.s.z) && this.ok(mx, my, mz) && this.ok(e.x, e.y, e.z)) {
        slot.life = this.life[0] + Math.random() * (this.life[1] - this.life[0]);
        slot.gold = Math.random() < this.goldChance;
        if (slot.gold) slot.life = Math.max(slot.life, 1.3); // golden stars linger a little — easier to catch
        slot.t0 = now;
        slot.fade = 1;
        slot.on = true;
        this.paint(si);
        return;
      }
    }
  }

  private paint(si: number) {
    const slot = this.slots[si];
    let c = WHITE;
    if (slot.gold) c = GOLD;
    else {
      let best = Infinity;
      for (const q of this.palette) {
        const d = q.p.distanceToSquared(slot.s);
        if (d < best) {
          best = d;
          c = q.c;
        }
      }
    }
    const base = si * this.segs;
    for (let k = 0; k < this.segs; k++) {
      const i = base + k;
      const f = k / this.segs;
      const w = (1 - f) * 0.55;
      this.b.col[i * 3] = c.r + (1 - c.r) * w;
      this.b.col[i * 3 + 1] = c.g + (1 - c.g) * w;
      this.b.col[i * 3 + 2] = c.b + (1 - c.b) * w;
      this.b.size[i] = (slot.gold ? 3.6 : 2.6) * (1 - f) + 0.5 + (slot.gold && k === 0 ? 4.5 : 0);
    }
    flag(this.b.g, "aColor");
    flag(this.b.g, "aSize");
  }

  update(now: number, allowed: boolean) {
    if (now >= this.next) {
      if (allowed) this.spawn(now, false);
      this.next = now + this.every[0] + Math.random() * (this.every[1] - this.every[0]);
    }
    while (this.queue.length && this.queue[0] <= now) {
      this.queue.shift();
      if (allowed) this.spawn(now, true);
    }
    let touched = false;
    for (let si = 0; si < this.slots.length; si++) {
      const s = this.slots[si];
      if (!s.on) continue;
      touched = true;
      const p = (now - s.t0) / s.life;
      const base = si * this.segs;
      // never linger into the silence: fade out quickly when streaks become disallowed
      s.fade = allowed ? Math.min(1, s.fade + 0.1) : s.fade - 0.08;
      if (p >= 1 || p < 0 || s.fade <= 0) {
        s.on = false;
        for (let k = 0; k < this.segs; k++) this.b.alpha[base + k] = 0;
        continue;
      }
      const head = p * s.len;
      const env = Math.sin(p * Math.PI) * s.fade;
      for (let k = 0; k < this.segs; k++) {
        const i = base + k;
        const back = Math.max(0, head - k * s.len * 0.022);
        const bend = (back * back) / s.len;
        this.b.pos[i * 3] = s.s.x + s.d.x * back + s.bend.x * bend;
        this.b.pos[i * 3 + 1] = s.s.y + s.d.y * back + s.bend.y * bend;
        this.b.pos[i * 3 + 2] = s.s.z + s.d.z * back + s.bend.z * bend;
        this.b.alpha[i] = Math.pow(1 - k / this.segs, 1.6) * env * 0.9;
      }
      s.head.set(this.b.pos[base * 3], this.b.pos[base * 3 + 1], this.b.pos[base * 3 + 2]);
    }
    if (touched) {
      flag(this.b.g, "position");
      flag(this.b.g, "aAlpha");
    }
  }

  /** Catch a golden star under the pointer (screen-space, generous radius). */
  catchAt(ndc: THREE.Vector2, camera: THREE.Camera, cssW: number, cssH: number, radiusPx: number, out: THREE.Vector3): boolean {
    for (let si = 0; si < this.slots.length; si++) {
      const s = this.slots[si];
      if (!s.on || !s.gold) continue;
      this.tmp.copy(s.head).project(camera);
      if (this.tmp.z > 1) continue;
      const dx = ((this.tmp.x - ndc.x) * cssW) / 2;
      const dy = ((this.tmp.y - ndc.y) * cssH) / 2;
      if (dx * dx + dy * dy <= radiusPx * radiusPx) {
        out.copy(s.head);
        s.on = false;
        const base = si * this.segs;
        for (let k = 0; k < this.segs; k++) this.b.alpha[base + k] = 0;
        flag(this.b.g, "aAlpha");
        return true;
      }
    }
    return false;
  }
}

/* ----------------------------------------------------------- fireflies -- */

export class Fireflies {
  private b: Buffers;
  private p: Float32Array;
  private base: Float32Array;
  private n: number;

  constructor(parent: THREE.Object3D, mk: Mk, track: Track, n: number, rnd: () => number, palette: THREE.Color[]) {
    this.n = n;
    this.b = buffers(n, () => rnd() * 6.283, 1.2);
    mount(parent, mk, track, this.b, 0.5);
    this.p = new Float32Array(n * 10);
    this.base = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const ang = rnd() * Math.PI * 2;
      const R = 45 + rnd() * 70;
      this.p.set(
        [Math.cos(ang) * R, 12 + rnd() * 30, Math.sin(ang) * R, 6 + rnd() * 9, 2 + rnd() * 4, 6 + rnd() * 9, 0.05 + rnd() * 0.07, 0.04 + rnd() * 0.06, 0.05 + rnd() * 0.07, rnd() * 6.283],
        i * 10
      );
      const c = palette[i % palette.length].clone().lerp(WHITE, 0.3);
      this.b.col.set([c.r, c.g, c.b], i * 3);
      this.b.size[i] = 3.2 + rnd() * 1.6;
      this.base[i] = 0.55 + rnd() * 0.3;
    }
    flag(this.b.g, "aColor");
    flag(this.b.g, "aSize");
  }

  update(t: number, cam: THREE.Vector3, on: boolean) {
    const { p, b } = this;
    for (let i = 0; i < this.n; i++) {
      const o = i * 10;
      const ph = p[o + 9];
      const x = p[o] + p[o + 3] * Math.sin(p[o + 6] * t + ph);
      const y = p[o + 1] + p[o + 4] * Math.sin(p[o + 7] * t + ph * 1.3);
      const z = p[o + 2] + p[o + 5] * Math.cos(p[o + 8] * t + ph * 0.7);
      b.pos[i * 3] = x;
      b.pos[i * 3 + 1] = y;
      b.pos[i * 3 + 2] = z;
      const dx = x - cam.x;
      const dy = y - cam.y;
      const dz = z - cam.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      b.alpha[i] = on ? this.base[i] * Math.min(1, Math.max(0, 1.25 - d / 170)) : 0;
    }
    flag(b.g, "position");
    flag(b.g, "aAlpha");
  }
}

/* ------------------------------------------------------- pointer trail -- */

export class PointerTrail {
  private b: Buffers;
  private birth: Float32Array;
  private head = 0;
  private n: number;
  private readonly life = 0.9;

  constructor(parent: THREE.Object3D, mk: Mk, track: Track, n: number) {
    this.n = n;
    this.b = buffers(n, (i) => i * 1.7, 2.4);
    mount(parent, mk, track, this.b, 0.6);
    this.birth = new Float32Array(n).fill(-100);
    for (let i = 0; i < n; i++) {
      const c = TRAIL[i % TRAIL.length];
      this.b.col.set([c.r, c.g, c.b], i * 3);
      this.b.size[i] = 1.2;
    }
    flag(this.b.g, "aColor");
  }

  emit(p: THREE.Vector3, now: number) {
    const i = this.head;
    this.head = (i + 1) % this.n;
    this.b.pos[i * 3] = p.x + (Math.random() - 0.5) * 0.6;
    this.b.pos[i * 3 + 1] = p.y + (Math.random() - 0.5) * 0.6;
    this.b.pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * 0.6;
    this.b.size[i] = 0.9 + Math.random() * 1.1;
    this.birth[i] = now;
  }

  update(now: number) {
    for (let i = 0; i < this.n; i++) {
      const age = now - this.birth[i];
      if (age < 0 || age > this.life) {
        this.b.alpha[i] = 0;
        continue;
      }
      const k = 1 - age / this.life;
      this.b.alpha[i] = k * k * 0.85;
      this.b.pos[i * 3 + 1] += 0.004;
    }
    flag(this.b.g, "position");
    flag(this.b.g, "aAlpha");
    flag(this.b.g, "aSize");
  }
}
