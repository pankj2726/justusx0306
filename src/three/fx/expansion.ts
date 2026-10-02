/* =========================================================================
   src/three/fx/expansion.ts — the galaxy grows.

   · event-matched satellites (one per memory, around its chapter world)
   · a deterministic planner for extra worlds, giant ringed worlds and the
     love planets (twin worlds, heart ring, heart belt)
   · UFO visitors with a cosmetic beam
   · discoveries (proximity or tap)

   Every object is a formation of the one four-point sparkle (THREE.Points
   through the shared sparkMaterial). Layout is a pure function of
   (GALAXY_SEED, stable id) via planetDesign.rngFor; Math.random() is only
   used for WHEN / WHERE transient visitors fly, never for placement.
   ========================================================================= */

import * as THREE from "three";
import { CHAPTER_BY_ID, eventsOfChapter, type ChapterId } from "@/data/canonicalTimeline";
import { COPY_GIANTS, COPY_HEART_BELT, COPY_HEART_RING, COPY_TWIN, COPY_UFO, COPY_WISH, COPY_WORLDS, type DiscoveryText } from "@/data/galaxyCopy";
import { GALAXY_SEED, rngFor } from "../planetDesign";
import { buildPlanetShell, seededDir, type SparkUniforms } from "../sparkleHD";
import { EXP, VOID_RULE, type ExpTier } from "./config";
import { binaryPair, heartCurve, ringDisc, RingTrail, saucer, sphereShell } from "./primitives";

type Tier = "low" | "medium" | "high";
export type Mk = (tw: number) => { mat: THREE.ShaderMaterial; u: SparkUniforms };

const WHITE = new THREE.Color("#fff6ff");
const GOLD = new THREE.Color("#d9b779");
const GOLD_HOT = new THREE.Color("#ffc46b");
const ROSE = new THREE.Color("#e5a0a9");
const SILENCE = new THREE.Color("#8aa0c0");
const LAVENDER = new THREE.Color("#c9a6ff");
const col = (h: string) => new THREE.Color(h);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const r3 = (x: number) => Math.round(x * 1000) / 1000;

const DEV = (() => {
  try {
    return !!(import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV;
  } catch {
    return false;
  }
})();

function localISO(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ================================================================ layout == */

export type ExpPlanet = { id: ChapterId; center: THREE.Vector3; radius: number; moonRadii: number[] };

export type ExpLayout = {
  planets: ExpPlanet[];
  /** centreline samples (xz) of the silence arc of the time spiral */
  voidArc: { x: number; z: number }[];
  hole: THREE.Vector3;
  spiralOuter: number;
  presentAnchor: THREE.Vector3;
  camOrbit: { radius: number; y: number };
};

/**
 * Signed clearance from the void (negative = inside, incl. the 12% buffer).
 * The void is the slab around the silence arc (horizontal band × thin
 * vertical slab) plus a sphere around the black hole.
 */
export function voidClearance(L: ExpLayout, x: number, y: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < L.voidArc.length; i++) {
    const s = L.voidArc[i];
    const dx = x - s.x;
    const dz = z - s.z;
    const d = dx * dx + dz * dz;
    if (d < best) best = d;
  }
  const B = VOID_RULE.buffer;
  const arc = Math.max(Math.sqrt(best) - VOID_RULE.halfWidth * B, Math.abs(y) - VOID_RULE.slab * B);
  const hole = Math.hypot(x - L.hole.x, y - L.hole.y, z - L.hole.z) - VOID_RULE.holeRadius * B;
  return Math.min(arc, hole);
}

/* ================================================================ planner == */

export type Archetype = "giant" | "twin" | "heartRing" | "heartBelt" | "ice" | "ember" | "storm" | "ghost" | "garden";
const EXTRA_ARCH = ["ice", "ember", "storm", "ghost", "garden"] as const;
type ExtraArch = (typeof EXTRA_ARCH)[number];
const isExtra = (a: Archetype): a is ExtraArch => (EXTRA_ARCH as readonly string[]).includes(a);

export type ExpansionPlan = {
  id: string;
  archetype: Archetype;
  index: number;
  name: string;
  line: string;
  center: [number, number, number];
  radius: number;
  extent: number;
  ring: boolean;
  tilt: number;
  node: number;
  discoverable: boolean;
};

export type Discoverable = { id: string; name: string; line: string; kind: Archetype | "ufo" | "wish" };

const MAX_GIANTS = 3;
const MAX_EXTRAS = 14;

/**
 * Deterministic placement of every planned object (largest first) by seeded
 * rejection sampling against: the void (+12%), chapter worlds (×3.2 incl.
 * satellite shells), the spiral band, the observatory camera orbit and all
 * previously placed objects. Plans are computed for the MAXIMUM counts so an
 * object keeps its id and position at every quality tier.
 */
export function planExpansion(L: ExpLayout, seed: string = GALAXY_SEED): { plans: ExpansionPlan[]; warnings: string[] } {
  const plans: ExpansionPlan[] = [];
  const warnings: string[] = [];
  const chR = L.planets.reduce((s, p) => s + p.radius, 0) / Math.max(1, L.planets.length);
  const placed: { c: THREE.Vector3; r: number; e: number }[] = [];
  const presentA = Math.atan2(L.presentAnchor.z, L.presentAnchor.x);
  const presentR = Math.hypot(L.presentAnchor.x, L.presentAnchor.z);
  type Rules = { spiral?: boolean; planets?: boolean };
  const tmp = new THREE.Vector3();

  const ok = (c: THREE.Vector3, r: number, e: number, relax: number, rules: Rules) => {
    if (voidClearance(L, c.x, c.y, c.z) < e) return false; // the void is never relaxed
    const h = Math.hypot(c.x, c.z);
    if (rules.spiral !== false && h < L.spiralOuter + e && Math.abs(c.y) < 14 + e) return false;
    if (rules.planets !== false) for (const p of L.planets) if (c.distanceTo(p.center) < (p.radius * 3.2 + e) * relax) return false;
    if (Math.hypot(h - L.camOrbit.radius, c.y - L.camOrbit.y) < (35 + e) * relax) return false;
    for (const q of placed) if (c.distanceTo(q.c) < Math.max(2.2 * (r + q.r), e + q.e + 6) * relax) return false;
    return true;
  };

  const place = (
    id: string,
    archetype: Archetype,
    index: number,
    copy: DiscoveryText,
    radius: number,
    extent: number,
    ring: boolean,
    sample: (rng: () => number, out: THREE.Vector3) => void,
    rules: Rules = {}
  ) => {
    const rng = rngFor(`${seed}:exp-place:${id}`);
    const shape = rngFor(`${seed}:exp-shape:${id}`);
    const tilt = r3(0.31 + shape() * 0.3);
    const node = r3(shape() * Math.PI * 2);
    let relax = 1;
    for (let round = 0; round < 4; round++) {
      for (let a = 0; a < 200; a++) {
        sample(rng, tmp);
        if (ok(tmp, radius, extent, relax, rules)) {
          placed.push({ c: tmp.clone(), r: radius, e: extent });
          plans.push({ id, archetype, index, name: copy.name, line: copy.line, center: [r3(tmp.x), r3(tmp.y), r3(tmp.z)], radius: r3(radius), extent: r3(extent), ring, tilt, node, discoverable: true });
          return;
        }
      }
      relax *= 0.9;
    }
    warnings.push(`expansion: could not place ${id}`);
  };

  const size = (id: string) => rngFor(`${seed}:exp-size:${id}`)();

  // 1) giant ringed worlds — far, high above the disc so they read as scenery
  for (let i = 0; i < MAX_GIANTS; i++) {
    const id = `exp:giant:${i}`;
    const radius = chR * (3 + size(id) * 2);
    place(id, "giant", i, COPY_GIANTS[i % COPY_GIANTS.length], radius, radius * 3.4, true, (rng, o) => {
      const a = rng() * Math.PI * 2;
      const h = 300 + rng() * 60;
      o.set(Math.cos(a) * h, 120 + rng() * 50, Math.sin(a) * h);
    });
  }

  // 2) the twin worlds — the romance quarter, just past the present edge
  {
    const id = "exp:twin:0";
    const radius = chR * 0.55;
    const extent = chR * (0.55 + 0.5) * 3.6 * 0.7 + radius;
    place(id, "twin", 0, COPY_TWIN, radius, extent, false, (rng, o) => {
      const a = presentA + 0.18 + rng() * 0.3;
      const h = 112 + rng() * 12;
      o.set(Math.cos(a) * h, 2 + rng() * 10, Math.sin(a) * h);
    });
  }

  // 3) the heart ring
  {
    const id = "exp:heartRing:0";
    const radius = chR * 0.5;
    place(id, "heartRing", 0, COPY_HEART_RING, radius, radius * 2.9, true, (rng, o) => {
      const a = presentA + 0.55 + rng() * 0.35;
      const h = 108 + rng() * 12;
      o.set(Math.cos(a) * h, 4 + rng() * 12, Math.sin(a) * h);
    });
  }

  // 4) the heart belt — dust around the present edge (faint, exempt from spiral/planet spacing, never from the void)
  {
    const id = "exp:heartBelt:0";
    const scale = 16;
    place(
      id,
      "heartBelt",
      0,
      COPY_HEART_BELT,
      scale,
      scale * 1.05,
      false,
      (rng, o) => {
        const a = presentA + (rng() - 0.5) * 0.12;
        const h = presentR + 14 + rng() * 6;
        o.set(Math.cos(a) * h, -14 + rng() * 4, Math.sin(a) * h);
      },
      { spiral: false, planets: false }
    );
  }

  // 5) extra worlds
  {
    const off = Math.floor(rngFor(`${seed}:exp-order`)() * EXTRA_ARCH.length);
    const used: Record<ExtraArch, number> = { ice: 0, ember: 0, storm: 0, ghost: 0, garden: 0 };
    for (let i = 0; i < MAX_EXTRAS; i++) {
      const arch = EXTRA_ARCH[(i + off) % EXTRA_ARCH.length];
      const id = `exp:${arch}:${used[arch]}`;
      const copy = COPY_WORLDS[arch][used[arch] % COPY_WORLDS[arch].length];
      used[arch]++;
      const radius = chR * (0.4 + size(id) * 0.6);
      const ring = i % 3 === 0;
      const extent = radius * (ring ? 2.4 : 1.6) + (arch === "ember" ? radius * 0.5 : 0);
      place(id, arch, i, copy, radius, extent, ring, (rng, o) => {
        const a = rng() * Math.PI * 2;
        const h = 100 + rng() * 90;
        const y = i % 2 === 0 ? 70 + rng() * 45 : -(20 + rng() * 40);
        o.set(Math.cos(a) * h, y, Math.sin(a) * h);
      });
    }
  }

  return { plans, warnings };
}

/* ================================================================ types == */

export type SatInput = {
  id: string;
  chapterId: ChapterId;
  date: string;
  title: string;
  favorite?: boolean;
  media?: number;
  special?: "reunion" | "silence-open";
};

export type ExpFrame = {
  state: string;
  camera: THREE.Camera;
  hovered: string | null;
  revealT: number | null;
  special: boolean;
};

export type ExpPick = {
  center: THREE.Vector3;
  radius: number;
  dist: number;
  info: { kind: "event" | "discovery" | "ufo"; id: string; title: string; via?: "satellite" };
};

export type ExpOptions = {
  root: THREE.Object3D;
  mk: Mk;
  track: (d: { dispose: () => void }) => void;
  tier: Tier;
  reduced: boolean;
  layout: ExpLayout;
  timeT: (date: string) => number;
  starPos: Map<string, THREE.Vector3>;
  starT: Map<string, number>;
  cb: {
    burst: (p: THREE.Vector3, n: number) => void;
    pulseStar: (id: string) => void;
    found: (id: string) => void;
    beam: (id: string) => void;
  };
};

type Dyn = { pts: THREE.Points; u: SparkUniforms; g: THREE.BufferGeometry; pos: Float32Array; col: Float32Array; size: Float32Array; alpha: Float32Array; n: number };

type Built = {
  plan: ExpansionPlan;
  root: THREE.Group;
  spinner: THREE.Object3D;
  spin: number;
  mats: SparkUniforms[];
  center: THREE.Vector3;
  pickR: number;
  rim?: THREE.Object3D;
  glint?: THREE.Object3D;
  drift?: SparkUniforms;
  update?: (t: number, dt: number, f: ExpFrame) => void;
};

type Shell = { key: string; planet: ExpPlanet; R: number; u: THREE.Vector3; w: THREE.Vector3; n: THREE.Vector3; omega: number; clearance: number };

type Sat = {
  id: string;
  chapterId: ChapterId;
  title: string;
  t: number;
  planet: ExpPlanet;
  shell: Shell;
  phase: number;
  phase0: number;
  core: THREE.Color;
  halo: THREE.Color;
  size: number;
  hsize: number;
  coreAlpha: number;
  media: number;
  reunion: boolean;
  revealed: boolean;
  popAt: number;
  pos: THREE.Vector3;
  pickR: number;
};

type Ufo = {
  root: THREE.Group;
  mats: SparkUniforms[];
  radius: number;
  active: boolean;
  u: number;
  dur: number;
  wp: THREE.Vector3[];
  pauseU: number;
  vis: number;
  pos: THREE.Vector3;
  trail: RingTrail;
  trailDyn: Dyn | null;
  lastEmit: number;
};

class Cloud {
  pos: number[] = [];
  col: number[] = [];
  size: number[] = [];
  alpha: number[] = [];
  phase: number[] = [];
  speed: number[] = [];
  push = (p: THREE.Vector3, c: THREE.Color, size: number, alpha: number, rnd: () => number) => this.add(p.x, p.y, p.z, c, size, alpha, rnd);
  add(x: number, y: number, z: number, c: THREE.Color, size: number, alpha: number, rnd: () => number) {
    this.pos.push(x, y, z);
    this.col.push(c.r, c.g, c.b);
    this.size.push(size);
    this.alpha.push(alpha);
    this.phase.push(rnd() * Math.PI * 2);
    this.speed.push(0.6 + rnd() * 2.4);
  }
  get count() {
    return this.pos.length / 3;
  }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("aColor", new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute("aSize", new THREE.Float32BufferAttribute(this.size, 1));
    g.setAttribute("aAlpha", new THREE.Float32BufferAttribute(this.alpha, 1));
    g.setAttribute("aPhase", new THREE.Float32BufferAttribute(this.phase, 1));
    g.setAttribute("aSpeed", new THREE.Float32BufferAttribute(this.speed, 1));
    return g;
  }
}

function flag(g: THREE.BufferGeometry, name: string) {
  (g.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
}

function catmull(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number, out: THREE.Vector3) {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return out.set(f(p0.x, p1.x, p2.x, p3.x), f(p0.y, p1.y, p2.y, p3.y), f(p0.z, p1.z, p2.z, p3.z));
}

/** Resting heartbeat: lub-dub, then rest. 0 … ~1. */
function beatWave(t: number, period = 4) {
  const p = t % period;
  const bump = (c: number, w: number) => Math.exp(-((p - c) * (p - c)) / (2 * w * w));
  return bump(0.18, 0.07) + 0.65 * bump(0.5, 0.08);
}

/* ================================================================ class == */

export class Expansion {
  readonly group = new THREE.Group();
  readonly plans: ExpansionPlan[];
  readonly warnings: string[];
  pointsAdded = 0;

  private o: ExpOptions;
  private X: ExpTier;
  private reduced: boolean;
  private enabled = true;
  private flags = { ufo: true, discoveries: true };
  private shed = 0;

  private built: Built[] = [];
  private scenery: SparkUniforms[] = [];
  private reveal = 1;
  private found = new Set<string>();
  private seen = new Map<string, number>();
  private detectAcc = 0;
  private lastT = -1;

  private planetById = new Map<ChapterId, ExpPlanet>();
  private shells = new Map<string, Shell>();
  private sats: Sat[] = [];
  private satById = new Map<string, number>();
  private satInput: SatInput[] = [];
  private satCore: Dyn | null = null;
  private satHalo: Dyn | null = null;
  private satSpeck: Dyn | null = null;
  private satTrail: Dyn | null = null;
  private satGuide: Dyn | null = null;
  private guideShells: { shell: Shell; start: number; count: number; alpha: number }[] = [];
  private detail = new Map<ChapterId, number>();
  private highlightId: string | null = null;
  private focusId: string | null = null;
  private violations: string[] = [];
  private lastParity: { chapter: string; canonical: number; events: number; satellites: number }[] = [];

  private ufos: Ufo[] = [];
  private nextUfo = 0;
  private beamDyn: Dyn | null = null;
  private beam = { on: false, t0: 0, ufo: -1, target: "", from: new THREE.Vector3(), to: new THREE.Vector3() };

  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private sphere = new THREE.Sphere();

  constructor(o: ExpOptions) {
    this.o = o;
    this.X = EXP[o.tier];
    this.reduced = o.reduced;
    o.root.add(this.group);
    for (const p of o.layout.planets) this.planetById.set(p.id, p);
    const { plans, warnings } = planExpansion(o.layout);
    this.plans = plans;
    this.warnings = warnings;
    this.buildScenery();
    this.buildSatBatches();
    this.buildUfos();
    this.devReport();
  }

  /* --------------------------------------------------------- helpers -- */

  private batch(parent: THREE.Object3D, cloud: Cloud, tw: number, scenery = true) {
    const m = this.o.mk(tw);
    const pts = new THREE.Points(cloud.geometry(), m.mat);
    pts.frustumCulled = false;
    parent.add(pts);
    this.o.track(pts.geometry);
    this.o.track(m.mat);
    this.pointsAdded += cloud.count;
    if (scenery) this.scenery.push(m.u);
    return { pts, u: m.u };
  }

  private dyn(parent: THREE.Object3D, n: number, tw: number, key: string): Dyn {
    const rr = rngFor(`exp-dyn:${key}`);
    const pos = new Float32Array(n * 3);
    const colA = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const alpha = new Float32Array(n);
    const phase = new Float32Array(n);
    const speed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      phase[i] = rr() * Math.PI * 2;
      speed[i] = 0.6 + rr() * 2.4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(colA, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    const m = this.o.mk(tw);
    const pts = new THREE.Points(g, m.mat);
    pts.frustumCulled = false;
    parent.add(pts);
    this.o.track(g);
    this.o.track(m.mat);
    this.pointsAdded += n;
    return { pts, u: m.u, g, pos, col: colA, size, alpha, n };
  }

  private makeRoot(p: ExpansionPlan) {
    const root = new THREE.Group();
    root.position.set(p.center[0], p.center[1], p.center[2]);
    const spinner = new THREE.Group();
    root.add(spinner);
    this.group.add(root);
    return { root, spinner };
  }

  private rng(id: string, k: string) {
    return rngFor(`exp:${id}:${k}`);
  }

  /* --------------------------------------------------------- scenery -- */

  private buildScenery() {
    const X = this.X;
    const giants = this.plans.filter((p) => p.archetype === "giant").slice(0, X.giants);
    giants.forEach((p, i) => this.buildGiant(p, i));
    const twin = this.plans.find((p) => p.archetype === "twin");
    if (twin) this.buildTwin(twin);
    const ring = this.plans.find((p) => p.archetype === "heartRing");
    if (ring) this.buildHeartRing(ring);
    const belt = this.plans.find((p) => p.archetype === "heartBelt");
    if (belt && X.heartBelt) this.buildHeartBelt(belt);
    this.plans.filter((p) => isExtra(p.archetype)).slice(0, X.extras).forEach((p) => this.buildExtra(p));
  }

  private extraStyle(p: ExpansionPlan) {
    const r = this.rng(p.id, "style");
    const V = (id: ChapterId) => CHAPTER_BY_ID[id].visual;
    switch (p.archetype as ExtraArch) {
      case "ice": {
        const base = col(V("ch-02").base).lerp(SILENCE, 0.5).lerp(WHITE, 0.25);
        const atmo = col("#dfe9ff");
        return { base, atmo, ringCol: col("#cfe0ff"), bands: [base, atmo, base.clone().lerp(WHITE, 0.3)], alpha: 0.85, vortex: null as null | THREE.Color };
      }
      case "ember": {
        const base = col(r() < 0.5 ? V("ch-01").base : V("ch-07").base);
        const atmo = col(V("ch-01").atmosphere);
        return { base, atmo, ringCol: col("#ffd27a"), bands: [base, atmo, col("#a85a28")], alpha: 1, vortex: null };
      }
      case "storm": {
        const alt = r() < 0.5;
        const base = col(alt ? V("ch-04").base : V("ch-05").base);
        const atmo = col(alt ? V("ch-04").atmosphere : V("ch-05").atmosphere);
        return { base, atmo, ringCol: atmo.clone().lerp(WHITE, 0.3), bands: [base, atmo, base.clone().multiplyScalar(0.7), atmo.clone().lerp(WHITE, 0.25)], alpha: 1, vortex: atmo.clone().lerp(WHITE, 0.35) };
      }
      case "ghost":
        return { base: SILENCE.clone(), atmo: col("#c9d6ff"), ringCol: col("#c9d6ff"), bands: null, alpha: 0.32, vortex: null };
      case "garden":
      default: {
        const base = col("#3f6f6a");
        const atmo = col("#5f9e8f");
        return { base, atmo, ringCol: col("#9cc9bd"), bands: [base, atmo, ROSE.clone(), col("#4f8a7c")], alpha: 0.9, vortex: null };
      }
    }
  }

  private buildExtra(p: ExpansionPlan) {
    const X = this.X;
    const { root, spinner } = this.makeRoot(p);
    const st = this.extraStyle(p);
    const M = X.extraPts / 520;
    const built: Built = { plan: p, root, spinner, spin: 0.015 + this.rng(p.id, "spin")() * 0.03, mats: [], center: root.position.clone(), pickR: p.radius * 1.35 };

    const body = new Cloud();
    buildPlanetShell(body, {
      id: p.id,
      radius: p.radius,
      base: st.base,
      atmo: st.atmo,
      white: WHITE,
      events: 0,
      M,
      rng: (k) => this.rng(p.id, k),
      bands: X.bands && st.bands ? st.bands : undefined,
      vortex: X.vortex && st.vortex ? { lat: 0.25 + this.rng(p.id, "vx")() * 0.3, lon: this.rng(p.id, "vy")() * Math.PI * 2, count: Math.round(70 * M * 2), color: st.vortex } : undefined,
      alpha: st.alpha,
    });
    built.mats.push(this.batch(spinner, body, 0.9).u);

    if (X.rims) {
      const rim = new Cloud();
      const rr = this.rng(p.id, "rim");
      const rimCol = st.atmo.clone().lerp(WHITE, 0.35);
      sphereShell(Math.round(160 * M), p.radius * 1.06, rr, (x, y, z) => rim.add(x, y, z, rimCol, 0.45 + rr() * 0.35, (0.35 + rr() * 0.25) * st.alpha, rr), { limbBias: 1 });
      const b = this.batch(spinner, rim, 0.8);
      built.rim = b.pts;
      built.mats.push(b.u);
    }

    if (p.ring) {
      const holder = new THREE.Group();
      holder.rotation.set(p.tilt, 0, p.node * 0.15);
      root.add(holder);
      const ring = new Cloud();
      const rr = this.rng(p.id, "ring");
      const R = p.radius;
      ringDisc(
        Math.round(300 * M),
        [
          { rIn: R * 1.5, rOut: R * 1.9, density: 1 },
          { rIn: R * 2.05, rOut: R * 2.35, density: 0.6 },
        ],
        rr,
        (x, y, z) => ring.add(x, y, z, st.ringCol.clone().lerp(WHITE, rr() * 0.3), 0.45 + rr() * 0.4, (0.3 + rr() * 0.25) * st.alpha, rr)
      );
      built.mats.push(this.batch(holder, ring, 0.7).u);
    }

    if (p.archetype === "ember") {
      const fl = new Cloud();
      const rr = this.rng(p.id, "flecks");
      const c = col("#ffb74b");
      for (let i = 0; i < Math.round(60 * M); i++) {
        const v = seededDir(rr).multiplyScalar(p.radius * (1.05 + rr() * 0.5));
        fl.push(v, c, 0.5 + rr() * 0.5, 0.35 + rr() * 0.3, rr);
      }
      const b = this.batch(spinner, fl, 1);
      b.u.uDrift.value = this.reduced ? 0 : 0.6;
      built.drift = b.u;
      built.mats.push(b.u);
    }

    if (p.archetype === "ghost") {
      const ol = new Cloud();
      const rr = this.rng(p.id, "outline");
      for (let i = 0; i < 56; i++) {
        if (i % 2) continue; // dotted
        const a = (i / 56) * Math.PI * 2;
        ol.add(Math.cos(a) * p.radius * 1.12, 0, Math.sin(a) * p.radius * 1.12, col("#c9d6ff"), 0.5, 0.25, rr);
      }
      const b = this.batch(root, ol, 0.6);
      built.mats.push(b.u);
      const bodyU = built.mats[0];
      built.update = (t) => {
        if (this.reduced) return;
        const k = 0.8 + 0.2 * Math.sin(t * 0.6);
        bodyU.uOpacity.value = k;
        b.u.uOpacity.value = k;
      };
    }

    this.built.push(built);
  }

  private buildGiant(p: ExpansionPlan, i: number) {
    const X = this.X;
    const { root, spinner } = this.makeRoot(p);
    const PAL = [
      [col("#c9843a"), col("#ffd27a"), col("#a85a28")],
      [SILENCE.clone(), LAVENDER.clone(), col("#5d6f8f")],
      [col("#c43d6e"), col("#ff8ab8"), ROSE.clone()],
    ][i % 3];
    const haze = 0.78;
    const R = p.radius;
    const built: Built = { plan: p, root, spinner, spin: 0.01, mats: [], center: root.position.clone(), pickR: R * 1.1 };

    const body = new Cloud();
    const rb = this.rng(p.id, "body");
    sphereShell(Math.round(X.giantPts * 0.4), R, rb, (x, y, z, _k, lat) => {
      const band = Math.floor((lat + 1) * 3.5) % 3;
      const c = PAL[band].clone().lerp(PAL[(band + 1) % 3], rb() * 0.35);
      body.add(x, y, z, c, 1.6 + rb() * 1.0, Math.min(0.55, (0.3 + rb() * 0.25) * haze), rb);
    });
    built.mats.push(this.batch(spinner, body, 0.6).u);

    const holder = new THREE.Group();
    holder.rotation.set(p.tilt, 0, (p.node - Math.PI) * 0.08);
    root.add(holder);
    const ring = new Cloud();
    const rr = this.rng(p.id, "rings");
    const ringCols = [PAL[1].clone().lerp(WHITE, 0.2), PAL[0].clone().lerp(PAL[1], 0.5), PAL[2].clone().lerp(WHITE, 0.15)];
    ringDisc(
      Math.round(X.giantPts * 0.6),
      [
        { rIn: R * 1.6, rOut: R * 2.1, density: 1 },
        { rIn: R * 2.25, rOut: R * 2.7, density: 0.8 },
        { rIn: R * 2.85, rOut: R * 3.4, density: 0.45 },
      ],
      rr,
      (x, y, z, _k, bi) => ring.add(x, y, z, ringCols[bi % 3].clone().lerp(WHITE, rr() * 0.2), 0.9 + rr() * 0.9, Math.min(0.55, (0.28 + rr() * 0.4) * haze), rr),
      { gaps: [R * 2.45, R * 3.1], gapWidth: R * 0.05, thickness: 0.012 }
    );
    built.mats.push(this.batch(holder, ring, 0.5).u);

    const neb = new Cloud();
    const rn = this.rng(p.id, "nebula");
    for (let k = 0; k < 40; k++) neb.push(seededDir(rn).multiplyScalar(R * (1.5 + rn() * 2.5)), PAL[1], 14 + rn() * 12, 0.035, rn);
    built.mats.push(this.batch(root, neb, 0.3).u);

    if (X.giantGlint) {
      const glint = new THREE.Group();
      holder.add(glint);
      const gl = new Cloud();
      const rg = this.rng(p.id, "glint");
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * 0.45;
        const r = R * (2.3 + rg() * 0.35);
        gl.add(Math.cos(a) * r, 0, Math.sin(a) * r, WHITE, 1.2 + rg() * 0.6, 0.5 * (1 - Math.abs(k / 12 - 1)), rg);
      }
      built.mats.push(this.batch(glint, gl, 0.4).u);
      built.glint = glint;
      built.update = (t) => {
        if (!this.reduced) glint.rotation.y = -(t / 20) * Math.PI * 2;
      };
    }
    this.built.push(built);
  }

  private buildTwin(p: ExpansionPlan) {
    const X = this.X;
    const { root, spinner } = this.makeRoot(p);
    const bp = binaryPair(this.rng(p.id, "binary"));
    const chR = p.radius / 0.55;
    const r1 = chR * bp.r1;
    const r2 = chR * bp.r2;
    const a = (r1 + r2) * bp.sep;
    const orbit = new THREE.Group();
    orbit.rotation.set(bp.tilt, bp.node, 0);
    spinner.add(orbit);
    const A = new THREE.Group();
    const B = new THREE.Group();
    orbit.add(A, B);
    const M = X.twinPts / 520;
    const mk = (g: THREE.Group, id: string, base: THREE.Color, atmo: THREE.Color, r: number) => {
      const c = new Cloud();
      buildPlanetShell(c, { id, radius: r, base, atmo, white: WHITE, events: 0, M, rng: (k) => this.rng(id, k), rim: 1 });
      return this.batch(g, c, 0.9).u;
    };
    const uA = mk(A, `${p.id}:rose`, ROSE.clone().multiplyScalar(0.85), col("#ffc9d2"), r1);
    const uB = mk(B, `${p.id}:gold`, GOLD.clone().multiplyScalar(0.85), col("#ffe2a8"), r2);
    const built: Built = { plan: p, root, spinner, spin: 0, mats: [uA, uB], center: root.position.clone(), pickR: p.extent * 0.8 };

    const bridge = X.twinBridge ? this.dyn(orbit, 24, 0.8, `${p.id}:bridge`) : null;
    if (bridge) {
      for (let k = 0; k < 24; k++) {
        const c = ROSE.clone().lerp(GOLD, k / 23).lerp(WHITE, 0.25);
        bridge.col.set([c.r, c.g, c.b], k * 3);
        bridge.size[k] = 0.35 + 0.25 * Math.sin((k / 23) * Math.PI);
      }
      flag(bridge.g, "aColor");
      flag(bridge.g, "aSize");
      this.scenery.push(bridge.u);
    }
    const mA = r1 * r1 * r1;
    const mB = r2 * r2 * r2;
    const dMin = (a * (1 - bp.e * bp.e)) / (1 + bp.e);
    const dMax = (a * (1 - bp.e * bp.e)) / (1 - bp.e);
    let flash = 0;
    let armed = true;
    built.update = (t, dt) => {
      const th = bp.phase + (this.reduced ? 0 : (t * Math.PI * 2) / bp.period);
      const d = (a * (1 - bp.e * bp.e)) / (1 + bp.e * Math.cos(th));
      const cx = Math.cos(th);
      const cz = Math.sin(th);
      A.position.set((-cx * d * mB) / (mA + mB), 0, (-cz * d * mB) / (mA + mB));
      B.position.set((cx * d * mA) / (mA + mB), 0, (cz * d * mA) / (mA + mB));
      const close = clamp01((dMax - d) / (dMax - dMin));
      if (bridge) {
        const al = 0.04 + 0.4 * close * close;
        for (let k = 0; k < 24; k++) {
          const f = (k + 1) / 25;
          const x0 = A.position.x + cx * r1;
          const z0 = A.position.z + cz * r1;
          const x1 = B.position.x - cx * r2;
          const z1 = B.position.z - cz * r2;
          bridge.pos[k * 3] = x0 + (x1 - x0) * f;
          bridge.pos[k * 3 + 1] = Math.sin(f * Math.PI) * 0.35;
          bridge.pos[k * 3 + 2] = z0 + (z1 - z0) * f;
          bridge.alpha[k] = al * (0.6 + 0.4 * Math.sin(f * Math.PI));
        }
        flag(bridge.g, "position");
        flag(bridge.g, "aAlpha");
      }
      if (X.twinSync && !this.reduced) {
        if (close > 0.985 && armed) {
          flash = 1;
          armed = false;
        }
        if (close < 0.5) armed = true;
        flash = Math.max(0, flash - dt * 0.9);
        uA.uOpacity.value = uB.uOpacity.value = 1 + 0.6 * flash;
      }
    };
    this.built.push(built);
  }

  private buildHeartRing(p: ExpansionPlan) {
    const X = this.X;
    const { root, spinner } = this.makeRoot(p);
    const R = p.radius;
    const M = X.heartRingPts / 520;
    const planet = new Cloud();
    buildPlanetShell(planet, { id: p.id, radius: R, base: ROSE.clone().multiplyScalar(0.8), atmo: GOLD.clone(), white: WHITE, events: 0, M, rng: (k) => this.rng(p.id, k), rim: X.rims ? 1 : 0 });
    const uP = this.batch(spinner, planet, 0.9).u;

    const precess = new THREE.Group();
    root.add(precess);
    const holder = new THREE.Group();
    holder.rotation.x = Math.PI / 3; // 60°
    precess.add(holder);
    const ring = new Cloud();
    const rr = this.rng(p.id, "heart");
    heartCurve(X.heartRingPts, R * 2.6, rr, (x, y, z, k) => ring.add(x, y, z, ROSE.clone().lerp(GOLD, (k % 40) / 40).lerp(WHITE, 0.15), 0.6 + rr() * 0.45, 0.4 + rr() * 0.25, rr), { fill: 0, jitter: 0.012, depth: 0.03 });
    const uR = this.batch(holder, ring, 0.7).u;

    const halo = new Cloud();
    const rh = this.rng(p.id, "halo");
    for (let k = 0; k < 30; k++) halo.push(seededDir(rh).multiplyScalar(R * (1.4 + rh() * 1.6)), ROSE, 6 + rh() * 6, 0.04, rh);
    const uH = this.batch(root, halo, 0.3).u;

    const built: Built = { plan: p, root, spinner, spin: 0.02, mats: [uP, uR, uH], center: root.position.clone(), pickR: R * 2.6 };
    built.update = (t, dt) => {
      if (this.reduced) {
        uR.uBeat.value = uP.uBeat.value = 0;
        return;
      }
      precess.rotation.y += dt * 0.03;
      const b = 0.05 * beatWave(t);
      uR.uBeat.value = b;
      uP.uBeat.value = b * 0.5;
    };
    this.built.push(built);
  }

  private buildHeartBelt(p: ExpansionPlan) {
    const X = this.X;
    const { root, spinner } = this.makeRoot(p);
    const tiltG = new THREE.Group();
    tiltG.rotation.x = -Math.PI / 2 + 0.32; // lies almost flat: reads as a heart from above
    spinner.add(tiltG);
    const sway = new THREE.Group();
    tiltG.add(sway);
    const belt = new Cloud();
    const rr = this.rng(p.id, "belt");
    const cols = [ROSE, GOLD, LAVENDER];
    heartCurve(X.beltPts, p.radius, rr, (x, y, z) => belt.add(x, y, z, cols[Math.floor(rr() * 3)].clone().lerp(WHITE, rr() * 0.2), 0.5 + rr() * 0.6, 0.08 + rr() * 0.08, rr), { fill: 0.08, jitter: 0.05, depth: 0.08 });
    const b = this.batch(sway, belt, 0.8);
    const built: Built = { plan: p, root, spinner, spin: 0, mats: [b.u], center: root.position.clone(), pickR: 0 };
    let bright = 1;
    built.update = (t, dt, f) => {
      if (!this.reduced) sway.rotation.z = Math.sin(t * 0.02) * 0.25;
      const want = X.beltBrighten && !this.reduced && (f.state === "present" || f.state === "reunion" || f.special) ? 1.7 : 1;
      bright += (want - bright) * Math.min(1, dt * 1.5);
      b.u.uOpacity.value = bright;
      b.u.uBeat.value = this.reduced ? 0 : 0.03 * beatWave(t);
    };
    this.built.push(built);
  }

  /* ------------------------------------------------------ satellites -- */

  private buildSatBatches() {
    const X = this.X;
    const cap = X.satCapacity;
    this.satCore = this.dyn(this.group, cap, 1, "sat-core");
    if (X.satHalos) this.satHalo = this.dyn(this.group, cap, 0.6, "sat-halo");
    this.satSpeck = this.dyn(this.group, cap, 1, "sat-speck");
    if (X.satTrails) this.satTrail = this.dyn(this.group, 8, 0.4, "sat-trail");
    if (X.satGuides) this.satGuide = this.dyn(this.group, 64 * 40, 0.2, "sat-guide");
    for (const d of [this.satCore, this.satHalo, this.satSpeck, this.satTrail, this.satGuide]) if (d) d.g.setDrawRange(0, 0);
  }

  hasSat(id: string) {
    return this.satById.has(id);
  }

  private shellFor(planet: ExpPlanet, k: number): Shell {
    const key = `${planet.id}:${k}`;
    const cached = this.shells.get(key);
    if (cached) return cached;
    const prev: Shell[] = [];
    for (let j = 0; j < k; j++) prev.push(this.shellFor(planet, j));
    let R = planet.radius * (1.55 + 0.42 * k);
    if (prev.length) R = Math.max(R, prev[prev.length - 1].R * 1.12);
    // clear every decorative moon orbit by ≥ 15%
    for (let guard = 0; guard < 8; guard++) {
      const m = planet.moonRadii.find((mr) => Math.abs(R - mr) / mr < 0.15);
      if (m === undefined) break;
      R = m * 1.15;
    }
    const rr = rngFor(`sat-shell:${planet.id}:${k}`);
    let best: Omit<Shell, "key" | "planet" | "R" | "omega"> | null = null;
    const p = this.tmp;
    for (let a = 0; a < 40; a++) {
      const incl = a < 20 ? 0.08 + rr() * 0.5 : 0.45 + rr() * 1.0;
      const node = rr() * Math.PI * 2;
      const u = new THREE.Vector3(Math.cos(node), 0, Math.sin(node));
      const n = new THREE.Vector3(0, 1, 0).applyAxisAngle(u, incl);
      const w = new THREE.Vector3().crossVectors(n, u).normalize();
      let sep = true;
      for (const s of prev) if (Math.acos(Math.min(1, Math.abs(n.dot(s.n)))) < (14 * Math.PI) / 180) sep = false;
      if (!sep) continue;
      let clear = Infinity;
      for (let q = 0; q < 24; q++) {
        const ph = (q / 24) * Math.PI * 2;
        p.copy(planet.center).addScaledVector(u, Math.cos(ph) * R).addScaledVector(w, Math.sin(ph) * R);
        clear = Math.min(clear, voidClearance(this.o.layout, p.x, p.y, p.z));
      }
      if (!best || clear > best.clearance) best = { u, w, n, clearance: clear };
      if (clear >= 0.3) break;
    }
    if (!best) {
      const u = new THREE.Vector3(1, 0, 0);
      best = { u, w: new THREE.Vector3(0, 0, 1), n: new THREE.Vector3(0, 1, 0), clearance: 0 };
    }
    if (best.clearance < 0) this.violations.push(`satellite shell ${key} dips ${(-best.clearance).toFixed(2)} into the void buffer`);
    const period = Math.min(120, 40 * Math.pow(R / (planet.radius * 1.55), 1.5));
    const shell: Shell = { key, planet, R, ...best, omega: ((k % 2 === 0 ? 1 : -1) * Math.PI * 2) / period };
    this.shells.set(key, shell);
    return shell;
  }

  /** Rebuild the satellite list — one satellite per memory, stable positions. */
  setSatellites(list: SatInput[]) {
    this.satInput = list;
    const X = this.X;
    const today = localISO();
    const byCh = new Map<ChapterId, SatInput[]>();
    for (const s of list) {
      if (!this.planetById.has(s.chapterId)) continue;
      const arr = byCh.get(s.chapterId) ?? [];
      arr.push(s);
      byCh.set(s.chapterId, arr);
    }
    const prevRevealed = new Map(this.sats.map((s) => [s.id, s]));
    const sats: Sat[] = [];
    const parity: typeof this.lastParity = [];
    for (const [chId, inputs] of byCh) {
      const planet = this.planetById.get(chId)!;
      const canon = eventsOfChapter(chId).map((e) => e.id);
      const canonCount = canon.length;
      const canonShells = Math.ceil(canonCount / 6);
      const custom = inputs.filter((s) => !canon.includes(s.id)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));
      const v = CHAPTER_BY_ID[chId].visual;
      for (const s of inputs) {
        const ci = canon.indexOf(s.id);
        let k: number;
        let idx: number;
        let m: number;
        if (ci >= 0) {
          k = Math.floor(ci / 6);
          idx = ci % 6;
          m = Math.min(6, canonCount - 6 * k);
        } else {
          const c = custom.indexOf(s);
          k = canonShells + Math.floor(c / 6);
          idx = c % 6;
          m = 6; // fixed spacing: adding a memory never moves another
        }
        const shell = this.shellFor(planet, k);
        const jr = rngFor(`sat:${s.id}`);
        const phase0 = (idx / m) * Math.PI * 2 + (jr() - 0.5) * 0.24 * ((Math.PI * 2) / m);
        const atmo = col(v.atmosphere);
        const core = atmo.clone().lerp(WHITE, 0.35);
        const halo = atmo.clone();
        let size = planet.radius * 0.42;
        let hsize = planet.radius * 1.5;
        let coreAlpha = 0.95;
        if (s.favorite) {
          size *= 1.25;
          hsize *= 1.25;
          halo.lerp(GOLD_HOT, 0.35);
        }
        if (s.special === "silence-open") {
          core.lerp(SILENCE, 0.55);
          halo.lerp(SILENCE, 0.6);
          coreAlpha = 0.72;
        }
        if (s.special === "reunion") {
          halo.copy(GOLD_HOT);
          hsize *= 1.3;
        }
        if (s.date > today) coreAlpha = 0.15; // future: hollow
        const prev = prevRevealed.get(s.id);
        sats.push({
          id: s.id,
          chapterId: chId,
          title: s.title,
          t: this.o.timeT(s.date),
          planet,
          shell,
          phase: prev ? prev.phase : phase0,
          phase0,
          core,
          halo,
          size,
          hsize,
          coreAlpha,
          media: s.media ?? 0,
          reunion: s.special === "reunion",
          revealed: prev ? prev.revealed : true,
          popAt: prev ? prev.popAt : -99,
          pos: prev ? prev.pos : new THREE.Vector3(),
          pickR: Math.max(1.1, planet.radius * 0.3),
        });
      }
      parity.push({ chapter: chId, canonical: canonCount, events: inputs.length, satellites: inputs.length });
    }

    if (sats.length > X.satCapacity) {
      this.violations.push(`satellites: ${sats.length} exceed capacity ${X.satCapacity}; extra ones hidden`);
      sats.length = X.satCapacity;
    }
    this.sats = sats;
    this.satById = new Map(sats.map((s, i) => [s.id, i]));
    parity.forEach((row) => (row.satellites = sats.filter((s) => s.chapterId === row.chapter).length));
    this.lastParity = parity.sort((a, b) => (a.chapter < b.chapter ? -1 : 1));

    // static attributes
    const n = sats.length;
    const core = this.satCore!;
    sats.forEach((s, i) => {
      core.col.set([s.core.r, s.core.g, s.core.b], i * 3);
      if (this.satHalo) this.satHalo.col.set([s.halo.r, s.halo.g, s.halo.b], i * 3);
      if (this.satSpeck) this.satSpeck.col.set([1, 0.97, 1], i * 3);
    });
    for (const d of [core, this.satHalo, this.satSpeck]) {
      if (!d) continue;
      d.g.setDrawRange(0, n);
      flag(d.g, "aColor");
    }
    if (this.satTrail) {
      for (let j = 0; j < 8; j++) {
        this.satTrail.col.set([GOLD_HOT.r, GOLD_HOT.g, GOLD_HOT.b], j * 3);
        this.satTrail.size[j] = 0.9 * (1 - j / 9);
      }
      flag(this.satTrail.g, "aColor");
      flag(this.satTrail.g, "aSize");
      this.satTrail.g.setDrawRange(0, sats.some((s) => s.reunion) ? 8 : 0);
    }
    // orbit guides: one sparse dotted ring per used shell
    this.guideShells = [];
    if (this.satGuide) {
      const used = Array.from(new Set(sats.map((s) => s.shell)));
      let at = 0;
      for (const sh of used) {
        if (at + 64 > this.satGuide.n) break;
        const c = col(CHAPTER_BY_ID[sh.planet.id].visual.atmosphere).lerp(WHITE, 0.3);
        for (let q = 0; q < 64; q++) {
          const ph = (q / 64) * Math.PI * 2;
          this.tmp.copy(sh.planet.center).addScaledVector(sh.u, Math.cos(ph) * sh.R).addScaledVector(sh.w, Math.sin(ph) * sh.R);
          this.satGuide.pos.set([this.tmp.x, this.tmp.y, this.tmp.z], (at + q) * 3);
          this.satGuide.col.set([c.r, c.g, c.b], (at + q) * 3);
          this.satGuide.size[at + q] = 0.32;
          this.satGuide.alpha[at + q] = 0;
        }
        this.guideShells.push({ shell: sh, start: at, count: 64, alpha: 0 });
        at += 64;
      }
      this.satGuide.g.setDrawRange(0, at);
      for (const a of ["position", "aColor", "aSize", "aAlpha"]) flag(this.satGuide.g, a);
    }
    if (DEV) console.table(this.lastParity);
  }

  highlight(id: string | null) {
    this.highlightId = id;
  }
  setFocusSat(id: string | null) {
    this.focusId = id;
  }
  satPos(id: string, out: THREE.Vector3): THREE.Vector3 | null {
    const i = this.satById.get(id);
    return i === undefined ? null : out.copy(this.sats[i].pos);
  }

  private updateSats(t: number, dt: number, f: ExpFrame) {
    const core = this.satCore;
    if (!core || !this.sats.length) return;
    const X = this.X;
    const cam = f.camera.position;
    for (const p of this.planetById.values()) {
      const dist = cam.distanceTo(p.center);
      const near = p.radius * 14;
      const far = p.radius * 26;
      this.detail.set(p.id, clamp01((far - dist) / (far - near)));
    }
    const full = f.state === "chapter" || f.state === "journey" || f.state === "reunion";
    const halo = this.satHalo;
    const speck = this.satSpeck;
    for (let i = 0; i < this.sats.length; i++) {
      const s = this.sats[i];
      const det = this.enabled ? this.detail.get(s.chapterId) ?? 0 : 0;
      const on = f.revealT == null || s.t <= f.revealT + 1e-6;
      if (on && !s.revealed && X.satPop && !this.reduced) s.popAt = t;
      s.revealed = on;
      const hov = f.hovered === s.id || this.highlightId === s.id;
      if (!this.reduced) s.phase += s.shell.omega * dt * (hov ? 0.35 : this.focusId === s.id ? 0.15 : 1);
      else s.phase = s.phase0;
      const sh = s.shell;
      s.pos
        .copy(sh.planet.center)
        .addScaledVector(sh.u, Math.cos(s.phase) * sh.R)
        .addScaledVector(sh.w, Math.sin(s.phase) * sh.R);
      let pop = 1;
      const pa = t - s.popAt;
      if (pa >= 0 && pa < 0.42) {
        const k = pa / 0.42;
        pop = k < 0.6 ? 0.05 + (k / 0.6) * 1.2 : 1.25 - 0.25 * ((k - 0.6) / 0.4);
      }
      const beat = s.reunion && !this.reduced ? 1 + 0.08 * beatWave(t) : 1;
      core.pos[i * 3] = s.pos.x;
      core.pos[i * 3 + 1] = s.pos.y;
      core.pos[i * 3 + 2] = s.pos.z;
      core.size[i] = on ? s.size * pop * beat * (hov ? 1.2 : 1) * (0.55 + 0.45 * det) : 0.0001;
      core.alpha[i] = on ? s.coreAlpha * (0.28 + 0.72 * det) : 0;
      if (halo) {
        halo.pos[i * 3] = s.pos.x;
        halo.pos[i * 3 + 1] = s.pos.y;
        halo.pos[i * 3 + 2] = s.pos.z;
        halo.size[i] = on ? s.hsize * pop * beat * (hov ? 1.6 : 1) : 0.0001;
        halo.alpha[i] = on ? 0.14 * det : 0;
      }
      if (speck) {
        const a = t * 1.6 + s.phase0 * 3;
        const off = s.planet.radius * 0.14;
        speck.pos[i * 3] = s.pos.x + Math.cos(a) * off;
        speck.pos[i * 3 + 1] = s.pos.y + Math.sin(a) * off * 0.5;
        speck.pos[i * 3 + 2] = s.pos.z + Math.sin(a) * off;
        speck.size[i] = 0.45;
        speck.alpha[i] = on && s.media > 0 ? 0.8 * det : 0;
      }
    }
    for (const d of [core, halo, speck]) {
      if (!d) continue;
      flag(d.g, "position");
      flag(d.g, "aSize");
      flag(d.g, "aAlpha");
    }
    // the reunion satellite's comet-tail
    if (this.satTrail) {
      const ri = this.sats.findIndex((s) => s.reunion);
      const tr = this.satTrail;
      if (ri >= 0) {
        const s = this.sats[ri];
        const det = this.enabled ? this.detail.get(s.chapterId) ?? 0 : 0;
        const dir = Math.sign(s.shell.omega) || 1;
        for (let j = 0; j < 8; j++) {
          const ph = s.phase - dir * (j + 1) * 0.06;
          this.tmp.copy(s.shell.planet.center).addScaledVector(s.shell.u, Math.cos(ph) * s.shell.R).addScaledVector(s.shell.w, Math.sin(ph) * s.shell.R);
          tr.pos.set([this.tmp.x, this.tmp.y, this.tmp.z], j * 3);
          tr.alpha[j] = s.revealed ? (1 - j / 8) * 0.5 * det : 0;
        }
        flag(tr.g, "position");
        flag(tr.g, "aAlpha");
      }
    }
    // guides: faint, only when close and in chapter/journey
    if (this.satGuide) {
      let changed = false;
      for (const gs of this.guideShells) {
        const want = this.enabled && full ? 0.07 * (this.detail.get(gs.shell.planet.id) ?? 0) : 0;
        if (Math.abs(want - gs.alpha) > 0.004) {
          gs.alpha = want;
          for (let q = 0; q < gs.count; q++) this.satGuide.alpha[gs.start + q] = want;
          changed = true;
        }
      }
      if (changed) flag(this.satGuide.g, "aAlpha");
    }
  }

  /* ------------------------------------------------------------ UFOs -- */

  private buildUfos() {
    const X = this.X;
    const chR = this.o.layout.planets.reduce((s, p) => s + p.radius, 0) / Math.max(1, this.o.layout.planets.length);
    const radius = chR * 0.3;
    for (let i = 0; i < X.ufos; i++) {
      const root = new THREE.Group();
      root.visible = false;
      this.group.add(root);
      const body = new Cloud();
      const lights = new Cloud();
      const rr = rngFor(`exp-ufo:${i}`);
      const lightCols = [ROSE, GOLD_HOT, SILENCE];
      saucer(150, radius, rr, (x, y, z, k, part) => {
        if (part === 2) lights.add(x, y, z, lightCols[k % 3], 1.3, 0.9, rr);
        else body.add(x, y, z, part === 1 ? col("#f3e9ff") : col("#ece6dc").lerp(LAVENDER, 0.3), part === 1 ? 0.55 : 0.5 + rr() * 0.3, part === 1 ? 0.55 : 0.35, rr);
      });
      const shimmer = new Cloud();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        shimmer.add(Math.cos(a) * radius * 0.6, -radius * 0.35, Math.sin(a) * radius * 0.6, GOLD_HOT.clone().lerp(WHITE, 0.4), 0.5, 0.2, rr);
      }
      const b1 = this.batch(root, body, 0.6, false);
      const b2 = this.batch(root, lights, 1, false);
      b2.u.uBlink.value = 1;
      b2.u.uBlinkRate.value = 3.2;
      const b3 = this.batch(root, shimmer, 0.8, false);
      b3.u.uDrift.value = 0.25;
      const trail = new RingTrail(14);
      const trailDyn = this.dyn(this.group, 14, 0.6, `ufo-trail:${i}`);
      for (let k = 0; k < 14; k++) {
        trailDyn.col.set([GOLD_HOT.r, GOLD_HOT.g * 0.9, GOLD_HOT.b], k * 3);
        trailDyn.size[k] = 0.45;
      }
      flag(trailDyn.g, "aColor");
      flag(trailDyn.g, "aSize");
      this.ufos.push({
        root,
        mats: [b1.u, b2.u, b3.u, trailDyn.u],
        radius,
        active: false,
        u: 0,
        dur: 30,
        wp: [0, 1, 2, 3, 4].map(() => new THREE.Vector3()),
        pauseU: -1,
        vis: 0,
        pos: new THREE.Vector3(),
        trail,
        trailDyn,
        lastEmit: 0,
      });
    }
    if (X.ufos > 0) {
      this.beamDyn = this.dyn(this.group, 40, 0.5, "ufo-beam");
      const cols = [ROSE, GOLD_HOT, WHITE];
      for (let k = 0; k < 40; k++) {
        const c = cols[k % 3];
        this.beamDyn.col.set([c.r, c.g, c.b], k * 3);
        this.beamDyn.size[k] = 0.55;
      }
      flag(this.beamDyn.g, "aColor");
      flag(this.beamDyn.g, "aSize");
    }
    this.nextUfo = 25 + Math.random() * 20; // transient timing only
  }

  private pathOk(ufo: Ufo) {
    const L = this.o.layout;
    const P = ufo.wp;
    for (let s = 0; s <= 48; s++) {
      this.evalPath(ufo, s / 48, this.tmp);
      if (voidClearance(L, this.tmp.x, this.tmp.y, this.tmp.z) < VOID_RULE.ufoMargin) return false;
    }
    return P.every((p) => voidClearance(L, p.x, p.y, p.z) >= VOID_RULE.ufoMargin);
  }

  private evalPath(ufo: Ufo, u: number, out: THREE.Vector3) {
    const W = ufo.wp;
    const seg = Math.min(3, Math.floor(u * 4));
    const local = u * 4 - seg;
    return catmull(W[Math.max(0, seg - 1)], W[seg], W[seg + 1], W[Math.min(4, seg + 2)], local, out);
  }

  private spawnUfo(ufo: Ufo) {
    for (let tries = 0; tries < 12; tries++) {
      const a0 = Math.random() * Math.PI * 2;
      const dir = Math.random() < 0.5 ? -1 : 1;
      for (let j = 0; j < 5; j++) {
        const a = a0 + dir * j * 0.6;
        const h = 60 + Math.random() * 80;
        ufo.wp[j].set(Math.cos(a) * h, 18 + Math.random() * 30, Math.sin(a) * h);
      }
      ufo.pauseU = -1;
      // occasionally pause to admire a discoverable
      const cands = this.built.filter((b) => b.pickR > 0 && Math.hypot(b.center.x, b.center.z) < 200 && b.center.y > -70 && b.center.y < 130);
      if (cands.length && Math.random() < 0.6) {
        const b = cands[Math.floor(Math.random() * cands.length)];
        const out = this.tmp2.copy(b.center).setY(0).normalize().multiplyScalar(-(b.plan.extent + 8));
        const saved = ufo.wp[2].clone();
        ufo.wp[2].copy(b.center).add(out).add(this.tmp.set(0, 4, 0));
        if (this.pathOk(ufo)) ufo.pauseU = 0.5;
        else ufo.wp[2].copy(saved);
      }
      if (this.pathOk(ufo)) {
        ufo.active = true;
        ufo.u = 0;
        ufo.dur = 26 + Math.random() * 14;
        ufo.trail.clear();
        return true;
      }
    }
    return false;
  }

  tapUfo(id: string) {
    const i = Number(id.split(":")[1]);
    const ufo = this.ufos[i];
    if (!ufo || !ufo.active || this.beam.on) return;
    const ids: string[] = [];
    for (const [sid, st] of this.o.starT) if (this.o.starPos.has(sid) && (this.lastRevealT == null || st <= this.lastRevealT)) ids.push(sid);
    if (!ids.length) return;
    const target = ids[Math.floor(Math.random() * ids.length)]; // cosmetic choice only
    this.beam.on = true;
    this.beam.t0 = this.lastT;
    this.beam.ufo = i;
    this.beam.target = target;
    this.beam.from.copy(ufo.pos).add(this.tmp.set(0, -ufo.radius * 0.4, 0));
    this.beam.to.copy(this.o.starPos.get(target)!);
    this.markFound("exp:ufo:first", true);
  }

  private lastRevealT: number | null = null;

  private updateUfos(t: number, dt: number, f: ExpFrame) {
    if (!this.ufos.length) return;
    const allowed = this.enabled && this.flags.ufo && !this.reduced && this.shed < 4;
    const calm = f.state === "silence" || f.state === "journey" || f.state === "reunion";
    if (t >= this.nextUfo) {
      const idle = this.ufos.find((u) => !u.active);
      if (idle && allowed && !calm) this.spawnUfo(idle);
      this.nextUfo = t + 45 + Math.random() * 45;
    }
    this.ufos.forEach((ufo, i) => {
      if (!ufo.active) {
        ufo.root.visible = false;
        if (ufo.trailDyn) ufo.trailDyn.g.setDrawRange(0, 0);
        return;
      }
      const beaming = this.beam.on && this.beam.ufo === i;
      if (!beaming) {
        const nearPause = ufo.pauseU >= 0 && Math.abs(ufo.u - ufo.pauseU) < 0.04;
        ufo.u += (dt / ufo.dur) * (nearPause ? 0.15 : 1);
      }
      if (ufo.u >= 1) {
        ufo.active = false;
        return;
      }
      this.evalPath(ufo, ufo.u, ufo.pos);
      ufo.pos.y += Math.sin(t * 1.7 + i) * 0.4;
      ufo.root.position.copy(ufo.pos);
      ufo.root.rotation.y += dt * 1.2;
      ufo.root.rotation.z = Math.sin(t * 0.8 + i) * 0.08;
      const ramp = Math.min(1, ufo.u / 0.06, (1 - ufo.u) / 0.06);
      const want = allowed && !calm ? ramp : 0;
      ufo.vis += (want - ufo.vis) * Math.min(1, dt * 3);
      ufo.root.visible = ufo.vis > 0.01;
      for (const m of ufo.mats) m.uReveal.value = ufo.vis;
      if (ufo.trailDyn) {
        if (t - ufo.lastEmit > 0.12) {
          ufo.trail.push(ufo.pos.x, ufo.pos.y - ufo.radius * 0.2, ufo.pos.z, t);
          ufo.lastEmit = t;
        }
        for (let k = 0; k < 14; k++) {
          ufo.trailDyn.pos[k * 3] = ufo.trail.pos[k * 3];
          ufo.trailDyn.pos[k * 3 + 1] = ufo.trail.pos[k * 3 + 1];
          ufo.trailDyn.pos[k * 3 + 2] = ufo.trail.pos[k * 3 + 2];
          ufo.trailDyn.alpha[k] = ufo.trail.alpha(k, t, 1.4) * 0.35;
        }
        ufo.trailDyn.g.setDrawRange(0, 14);
        flag(ufo.trailDyn.g, "position");
        flag(ufo.trailDyn.g, "aAlpha");
      }
    });
    // the beam — purely cosmetic, never moves or alters a star
    const bd = this.beamDyn;
    if (bd) {
      if (this.beam.on) {
        const prog = (t - this.beam.t0) / 1.8;
        if (prog >= 1) {
          this.beam.on = false;
          for (let k = 0; k < 40; k++) bd.alpha[k] = 0;
          this.o.cb.pulseStar(this.beam.target);
          this.o.cb.burst(this.beam.to, 14);
          this.o.cb.beam(this.beam.target);
        } else {
          const env = Math.min(1, prog * 5, (1 - prog) * 5);
          for (let k = 0; k < 40; k++) {
            const ff = (k / 40 + prog * 2.2) % 1;
            this.tmp.copy(this.beam.from).lerp(this.beam.to, ff);
            bd.pos[k * 3] = this.tmp.x + Math.sin(k * 1.7 + t * 3) * 0.25;
            bd.pos[k * 3 + 1] = this.tmp.y;
            bd.pos[k * 3 + 2] = this.tmp.z + Math.cos(k * 1.3 + t * 3) * 0.25;
            bd.alpha[k] = Math.sin(ff * Math.PI) * 0.85 * env;
          }
        }
        flag(bd.g, "position");
        flag(bd.g, "aAlpha");
      }
    }
  }

  /* ----------------------------------------------------- discoveries -- */

  setFound(ids: string[]) {
    this.found = new Set(ids);
  }

  markFound(id: string, fromTap: boolean): boolean {
    void fromTap;
    if (!this.flags.discoveries || this.found.has(id)) return false;
    if (!this.discoverables().some((d) => d.id === id)) return false;
    this.found.add(id);
    const b = this.built.find((x) => x.plan.id === id);
    if (b && !this.reduced) this.o.cb.burst(b.center, this.X.burst === "full" ? 24 : 10);
    this.o.cb.found(id);
    return true;
  }

  discoverables(): Discoverable[] {
    const out: Discoverable[] = this.built.map((b) => ({ id: b.plan.id, name: b.plan.name, line: b.plan.line, kind: b.plan.archetype }));
    if (this.X.ufos > 0) out.push({ id: "exp:ufo:first", name: COPY_UFO.name, line: COPY_UFO.line, kind: "ufo" });
    if (this.X.goldChance > 0) out.push({ id: "exp:wish:first", name: COPY_WISH.name, line: COPY_WISH.line, kind: "wish" });
    return out;
  }

  focusFor(id: string): { pos: THREE.Vector3; dist: number } | null {
    const b = this.built.find((x) => x.plan.id === id);
    return b ? { pos: b.center.clone(), dist: Math.max(b.plan.extent * 2.6, b.plan.radius * 6) + 8 } : null;
  }

  private detect(f: ExpFrame) {
    if (!this.flags.discoveries || !this.enabled) return;
    const cam = f.camera.position;
    for (const b of this.built) {
      const id = b.plan.id;
      if (this.found.has(id)) continue;
      const range = Math.max(b.plan.radius * 2.5, b.plan.extent * 1.6);
      this.tmp.copy(b.center).project(f.camera);
      const onScreen = this.tmp.z < 1 && Math.abs(this.tmp.x) < 1 && Math.abs(this.tmp.y) < 1;
      if (onScreen && cam.distanceTo(b.center) < range) {
        const s = (this.seen.get(id) ?? 0) + 0.3;
        this.seen.set(id, s);
        if (s >= 1.2) this.markFound(id, false);
      } else this.seen.delete(id);
    }
  }

  /* ------------------------------------------------------------ pick -- */

  /* pick result is reused (no per-frame allocation); read it immediately */
  private pickOut: ExpPick = { center: new THREE.Vector3(), radius: 0, dist: 0, info: { kind: "event", id: "", title: "" } };
  private pickFound = false;

  private pickTest(ray: THREE.Ray, camPos: THREE.Vector3, center: THREE.Vector3, radius: number, kind: ExpPick["info"]["kind"], id: string, title: string, via?: "satellite") {
    this.sphere.center.copy(center);
    this.sphere.radius = radius;
    if (!ray.intersectSphere(this.sphere, this.tmp2)) return;
    const d = camPos.distanceTo(this.tmp2);
    if (this.pickFound && d >= this.pickOut.dist) return;
    this.pickFound = true;
    const o = this.pickOut;
    o.center.copy(center);
    o.radius = radius;
    o.dist = d;
    o.info.kind = kind;
    o.info.id = id;
    o.info.title = title;
    o.info.via = via;
  }

  pick(ray: THREE.Ray, camPos: THREE.Vector3): ExpPick | null {
    if (!this.enabled) return null;
    this.pickFound = false;
    for (let i = 0; i < this.sats.length; i++) {
      const s = this.sats[i];
      if (!s.revealed || (this.detail.get(s.chapterId) ?? 0) < 0.5) continue;
      this.pickTest(ray, camPos, s.pos, s.pickR, "event", s.id, s.title, "satellite");
    }
    if (this.reveal > 0.5) for (const b of this.built) if (b.pickR > 0) this.pickTest(ray, camPos, b.center, b.pickR, "discovery", b.plan.id, b.plan.name);
    for (let i = 0; i < this.ufos.length; i++) {
      const u = this.ufos[i];
      if (u.active && u.vis > 0.5) this.pickTest(ray, camPos, u.pos, u.radius * 3, "ufo", `ufo:${i}`, "A small visitor");
    }
    return this.pickFound ? this.pickOut : null;
  }

  /* ----------------------------------------------------------- state -- */

  setEnabled(on: boolean) {
    this.enabled = on;
    this.group.visible = on;
    if (!on) this.beam.on = false;
  }

  setFlags(f: Partial<{ ufo: boolean; discoveries: boolean }>) {
    Object.assign(this.flags, f);
  }

  setReduced(b: boolean) {
    this.reduced = b;
    for (const x of this.built) if (x.drift) x.drift.uDrift.value = b ? 0 : 0.6;
  }

  /** Frame-time guard: 1 giant glint · 3 extra-world rims · 4 UFOs (2 = fireflies, 5 = streaks are handled by the scene). */
  setShed(level: number) {
    this.shed = level;
    for (const b of this.built) {
      if (b.glint) b.glint.visible = level < 1;
      if (b.rim) b.rim.visible = level < 3;
    }
  }

  update(t: number, f: ExpFrame) {
    const dt = this.lastT < 0 ? 0 : Math.min(0.05, Math.max(0, t - this.lastT));
    this.lastT = t;
    this.lastRevealT = f.revealT;
    // expansion scenery never lingers in the silence
    const want = this.enabled && f.state !== "silence" ? 1 : 0;
    this.reveal = this.reduced ? want : this.reveal + (want - this.reveal) * Math.min(1, dt * 2.2);
    for (const u of this.scenery) u.uReveal.value = this.reveal;
    for (const b of this.built) {
      if (!this.reduced && b.spin) b.spinner.rotation.y += dt * b.spin;
      b.update?.(t, dt, f);
    }
    this.updateSats(t, dt, f);
    this.updateUfos(t, dt, f);
    this.detectAcc += dt;
    if (this.detectAcc >= 0.3) {
      this.detectAcc = 0;
      this.detect(f);
    }
  }

  /* ------------------------------------------------------------ debug -- */

  private devReport() {
    const L = this.o.layout;
    for (const p of this.plans) {
      const c = voidClearance(L, p.center[0], p.center[1], p.center[2]);
      if (c < p.extent) this.violations.push(`plan ${p.id} clearance ${c.toFixed(1)} < extent ${p.extent}`);
    }
    if (this.pointsAdded > this.X.pointCap) this.violations.push(`points ${this.pointsAdded} exceed cap ${this.X.pointCap}`);
    if (DEV) {
      this.warnings.forEach((w) => console.warn(w));
      if (this.violations.length) console.warn("[expansion] void/cap checker:", this.violations);
      else console.info(`[expansion] void checker OK · ${this.plans.length} plans · ${this.pointsAdded} new points (cap ${this.X.pointCap})`);
    }
  }

  debug() {
    return {
      seed: GALAXY_SEED,
      plans: this.plans,
      warnings: this.warnings,
      violations: this.violations,
      points: this.pointsAdded,
      pointCap: this.X.pointCap,
      parity: this.lastParity,
      satellites: this.sats.map((s) => ({ id: s.id, chapter: s.chapterId, shell: s.shell.key, R: r3(s.shell.R), phase0: r3(s.phase0), omega: r3(s.shell.omega) })),
      inputCount: this.satInput.length,
    };
  }
}
