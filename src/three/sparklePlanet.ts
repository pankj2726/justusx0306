/* =========================================================================
   src/three/sparklePlanet.ts — HD chapter cover planets.

   Each cover is the galaxy's own chapter planet: the SAME HD body recipe
   (buildPlanetShell from sparkleHD.ts, seeded by "sparkverse::…" exactly
   like galaxyScene.ts), the same ring band / lavender crescent, the same
   moons and moon motion, drawn with the same analytic HD sparkle.

   Rendering: ONE shared WebGL context ("the studio") renders every visible
   cover at up to 2× resolution and copies it into that cover's own 2D
   canvas, so any number of covers never exhausts browser WebGL contexts.
   ========================================================================= */

import * as THREE from "three";
import {
  CHAPTERS,
  EVENTS,
  FIRST_DATE,
  LAST_DATE,
  SILENCE_END,
  SILENCE_START,
  parseISO,
  type Chapter,
  type ChapterId,
} from "@/data/canonicalTimeline";
import { detectTier, prefersReducedMotion } from "@/lib/quality";
import { buildPlanetShell, maxPointSize, originalPixelRatio, seededDir, sparkMaterial, sparkTextureHD, type SparkUniforms } from "./sparkleHD";

/* ------------------------------------------ constants mirrored from v3 -- */

const PERIWINKLE = new THREE.Color("#8f9bff");
const WHITE = new THREE.Color("#fff6ff");

const N_EVENTS = EVENTS.length;
const N_CHAPTERS = CHAPTERS.length;
const T0 = parseISO(FIRST_DATE);
const T1 = parseISO(LAST_DATE);
const SIL_A = (parseISO(SILENCE_START) - T0) / (T1 - T0);
const SIL_B = (parseISO(SILENCE_END) - T0) / (T1 - T0);
const TURNS = 1.9 + N_CHAPTERS * 0.065;
const R_IN = 16;
const R_OUT = 68 + N_EVENTS * 0.2;
const LANE_W = 5.2;
const FOV = 52;

const timeT = (date: string) => (parseISO(date) - T0) / (T1 - T0);
const spiralRadius = (t: number) => R_IN + (R_OUT - R_IN) * Math.pow(t, 0.85);
const spiralAngle = (t: number) => t * TURNS * Math.PI * 2;
const laneOffset = (i: number) => (i - (N_CHAPTERS - 1) / 2) * LANE_W;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const rngFor = (key: string) => mulberry32(hashStr("sparkverse::" + key));

class CloudBuilder {
  pos: number[] = [];
  col: number[] = [];
  size: number[] = [];
  phase: number[] = [];
  speed: number[] = [];
  alpha: number[] = [];
  push = (p: THREE.Vector3, c: THREE.Color, size: number, alpha: number, rnd: () => number) => {
    this.pos.push(p.x, p.y, p.z);
    this.col.push(c.r, c.g, c.b);
    this.size.push(size);
    this.alpha.push(alpha);
    this.phase.push(rnd() * Math.PI * 2);
    this.speed.push(0.6 + rnd() * 2.4);
  };
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

/* ------------------------------------------------------- planet model -- */

type MoonDatum = { r: number; speed: number; phase: number; tilt: number };

type PlanetModel = {
  id: ChapterId;
  group: THREE.Group;
  radius: number;
  fitPlanet: number;
  fitSystem: number;
  azimuth: number;
  elevation: number;
  moons: THREE.Points;
  moonBase: Float32Array;
  moonData: MoonDatum[];
  materials: { u: SparkUniforms; tw: number }[];
  lastT: number;
};

function buildPlanet(ch: Chapter, M: number, tex: THREE.Texture): PlanetModel {
  const materials: { u: SparkUniforms; tw: number }[] = [];
  const mk = (tw: number) => {
    const m = sparkMaterial(tw, tex);
    materials.push({ u: m.u, tw });
    return m;
  };
  const addPoints = (group: THREE.Group, b: CloudBuilder, tw: number) => {
    const m = mk(tw);
    const pts = new THREE.Points(b.geometry(), m.mat);
    pts.frustumCulled = false;
    group.add(pts);
    return pts;
  };

  const evs = EVENTS.filter((e) => e.chapterId === ch.id);
  const tMid = evs.length ? evs.reduce((s, e) => s + timeT(e.date), 0) / evs.length : (SIL_A + SIL_B) / 2;
  const a = spiralAngle(tMid) + 0.35;
  const rr0 = spiralRadius(tMid) + laneOffset(ch.index - 1) + 6;
  const lift = evs.length === 0 ? -7 : 9 + (ch.index % 3) * 5;
  const center = new THREE.Vector3(Math.cos(a) * rr0, lift, Math.sin(a) * rr0);
  const radius = 2.0 + Math.sqrt(Math.max(1, evs.length)) * 0.62;

  const group = new THREE.Group();
  const base = new THREE.Color(ch.visual.base);
  const atmo = new THREE.Color(ch.visual.atmosphere);

  /* HD body — the exact same recipe the galaxy uses */
  {
    const b = new CloudBuilder();
    buildPlanetShell(b, { id: ch.id, radius, base, atmo, white: WHITE, events: evs.length, M, rng: rngFor });
    addPoints(group, b, 0.9);
  }

  /* ring band, or the lavender crescent for the darkest chapter */
  let ringExtent = 0;
  if (ch.visual.ring) {
    const b = new CloudBuilder();
    const rr = rngFor("ring-" + ch.id);
    const ringCol = new THREE.Color(ch.visual.ring).lerp(PERIWINKLE, 0.45);
    const tilt = 0.42 + rr() * 0.3;
    const ringN = Math.round((500 + evs.length * 40) * M);
    for (let i = 0; i < ringN; i++) {
      const ra = rr() * Math.PI * 2;
      const band = rr() < 0.7 ? 1.7 + rr() * 0.35 : 2.2 + rr() * 0.5;
      const rr2 = radius * band;
      const v = new THREE.Vector3(Math.cos(ra) * rr2, (rr() - 0.5) * radius * 0.12, Math.sin(ra) * rr2);
      v.applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt);
      b.push(v, ringCol.clone().lerp(WHITE, rr() * 0.3), 0.6 + rr() * 0.8, 0.5 + rr() * 0.4, rr);
    }
    addPoints(group, b, 0.7);
    ringExtent = radius * 2.75;
  } else if (ch.visual.glow < 0.4) {
    const b = new CloudBuilder();
    const rr = rngFor("cres-" + ch.id);
    for (let i = 0; i < Math.round(220 * M); i++) {
      const ca = rr() * Math.PI * 1.2;
      const v = new THREE.Vector3(Math.cos(ca) * radius * 3.1, (rr() - 0.5) * 0.4, Math.sin(ca) * radius * 3.1);
      v.applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.5);
      b.push(v, new THREE.Color("#c9a6ff"), 0.7 + rr() * 0.6, 0.55 + rr() * 0.35, rr);
    }
    addPoints(group, b, 0.8);
    ringExtent = radius * 3.2;
  }

  /* moons */
  const moonData: MoonDatum[] = [];
  const mb = new CloudBuilder();
  const rr = rngFor("moons-" + ch.id);
  for (let mI = 0; mI < ch.visual.moons; mI++) {
    const md = { r: radius * (2.6 + mI * 0.9 + rr() * 0.6), speed: 0.25 + rr() * 0.3, phase: rr() * Math.PI * 2, tilt: (rr() - 0.5) * 0.9 };
    moonData.push(md);
    for (let i = 0; i < Math.round(70 * M); i++) {
      const off = seededDir(rr).multiplyScalar(0.5 + rr() * 0.5);
      mb.push(off, atmo.clone().lerp(WHITE, 0.4), 0.7 + rr() * 0.7, 0.7 + rr() * 0.3, rr);
    }
  }
  const moons = addPoints(group, mb, 1);

  const moonMax = moonData.reduce((mx, m) => Math.max(mx, m.r + 1.1), 0);
  const fitPlanet = Math.max(ringExtent, radius * 1.9);

  return {
    id: ch.id,
    group,
    radius,
    fitPlanet,
    fitSystem: Math.max(fitPlanet, moonMax),
    // same viewing direction the galaxy camera uses when it flies to this chapter
    azimuth: Math.atan2(center.z, center.x),
    elevation: Math.atan2(radius * 2.2 + 6, radius * 5.5 + 12),
    moons,
    moonBase: new Float32Array(moons.geometry.getAttribute("position").array as Float32Array),
    moonData,
    materials,
    lastT: -1,
  };
}

/* ------------------------------------------------------------ studio --- */

export type CoverFit = "planet" | "system";

export type CoverEntry = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  chapterId: ChapterId;
  fit: CoverFit;
  zoom: number;
  spin: boolean;
  phase: number;
  visible: boolean;
};

class PlanetStudio {
  private static instance: PlanetStudio | null | undefined;

  static get(): PlanetStudio | null {
    if (PlanetStudio.instance !== undefined) return PlanetStudio.instance;
    try {
      PlanetStudio.instance = new PlanetStudio();
    } catch (err) {
      console.warn("Sparkle planets: WebGL unavailable", err);
      PlanetStudio.instance = null;
    }
    return PlanetStudio.instance;
  }

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 1000);
  private models = new Map<ChapterId, PlanetModel>();
  private entries = new Set<CoverEntry>();
  private bufW = 0;
  private bufH = 0;
  private raf = 0;
  private last = 0;
  private time = 0;
  private reduced = prefersReducedMotion();
  private M: number;
  private maxPt: number;
  private tex: THREE.Texture;

  private constructor() {
    const canvas = document.createElement("canvas");
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);
    this.maxPt = maxPointSize(this.renderer);
    this.tex = sparkTextureHD();
    this.tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const tier = detectTier();
    // same density as the galaxy — original values
    this.M = tier === "high" ? 1 : tier === "medium" ? 0.6 : 0.35;
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    mq?.addEventListener?.("change", (e) => (this.reduced = e.matches));
  }

  register(e: Omit<CoverEntry, "ctx" | "visible">): CoverEntry | null {
    const ctx = e.canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const entry: CoverEntry = { ...e, ctx, visible: false };
    this.entries.add(entry);
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    }
    return entry;
  }

  unregister(e: CoverEntry) {
    this.entries.delete(e);
    if (!this.entries.size && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private model(id: ChapterId): PlanetModel | null {
    let m = this.models.get(id);
    if (!m) {
      const ch = CHAPTERS.find((c) => c.id === id);
      if (!ch) return null;
      m = buildPlanet(ch, this.M, this.tex);
      this.models.set(id, m);
    }
    return m;
  }

  private animate(m: PlanetModel) {
    if (m.lastT === this.time) return;
    m.lastT = this.time;
    const t = this.time;
    for (const { u, tw } of m.materials) {
      u.uTime.value = t;
      u.uTwinkle.value = this.reduced ? 0 : tw;
    }
    // moon motion — identical to the galaxy tick
    const attr = m.moons.geometry.getAttribute("position") as THREE.BufferAttribute;
    const c = new THREE.Vector3();
    m.moonData.forEach((md, mi) => {
      const a = md.phase + t * md.speed;
      c.set(Math.cos(a) * md.r, Math.sin(a) * md.r * Math.sin(md.tilt) * 0.4, Math.sin(a) * md.r);
      const per = attr.count / Math.max(1, m.moonData.length);
      for (let v = 0; v < per; v++) {
        const idx = mi * Math.round(attr.count / m.moonData.length) + v;
        if (idx >= attr.count) break;
        attr.setXYZ(idx, m.moonBase[idx * 3] + c.x, m.moonBase[idx * 3 + 1] + c.y, m.moonBase[idx * 3 + 2] + c.z);
      }
    });
    attr.needsUpdate = true;
  }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.reduced) this.time += dt;

    for (const e of this.entries) {
      if (!e.visible) continue;
      const cssW = e.canvas.clientWidth;
      const cssH = e.canvas.clientHeight;
      if (!cssW || !cssH) continue;
      const m = this.model(e.chapterId);
      if (!m) continue;

      // HD: supersample small/medium covers at 2×, very large ones at 1.5×
      const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), cssW > 520 ? 1.5 : 2);
      const bw = Math.round(cssW * dpr);
      const bh = Math.round(cssH * dpr);
      if (e.canvas.width !== bw || e.canvas.height !== bh) {
        e.canvas.width = bw;
        e.canvas.height = bh;
      }
      if (bw > this.bufW || bh > this.bufH) {
        this.bufW = Math.max(this.bufW, bw);
        this.bufH = Math.max(this.bufH, bh);
        this.renderer.setSize(this.bufW, this.bufH, false);
      }

      this.animate(m);

      const aspect = bw / bh;
      const half = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
      const fit = (e.fit === "system" ? m.fitSystem : m.fitPlanet) / e.zoom;
      const dist = fit / (half * Math.min(1, aspect));
      const az = m.azimuth + e.phase + (e.spin ? this.time * 0.05 : 0);
      const el = m.elevation;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      this.camera.position.set(Math.cos(el) * Math.cos(az) * dist, Math.sin(el) * dist, Math.cos(el) * Math.sin(az) * dist);
      this.camera.lookAt(0, 0, 0);

      // original cover clamps (6px / 7% of height, 0.6px min), rescaled for supersampling
      const k = dpr / originalPixelRatio();
      const scale = bh / (2 * half);
      for (const { u } of m.materials) {
        u.uScale.value = scale;
        u.uMaxSize.value = Math.min(this.maxPt, Math.max(6 * k, bh * 0.07));
        u.uMinPx.value = 0.6 * k;
      }

      this.renderer.setViewport(0, 0, bw, bh);
      this.renderer.setScissor(0, 0, bw, bh);
      this.renderer.setScissorTest(true);
      this.renderer.clear();
      this.scene.add(m.group);
      this.renderer.render(this.scene, this.camera);
      this.scene.remove(m.group);

      e.ctx.clearRect(0, 0, bw, bh);
      e.ctx.drawImage(this.renderer.domElement, 0, this.bufH - bh, bw, bh, 0, 0, bw, bh);
    }
  };
}

export function getPlanetStudio() {
  return PlanetStudio.get();
}
