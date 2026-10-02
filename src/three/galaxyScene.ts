/* =========================================================================
   src/three/galaxyScene.ts — REBUILT FROM SCRATCH, v3

   TWO RULES (operator directive):
   1. THE GALAXY DEVELOPS FROM THE NUMBER OF EVENTS.
      - EVENTS.length (52) drives: background sparkle count, heart mass,
        knot richness, strand sampling, core bulge, galaxy outer radius.
      - CHAPTERS.length (7) drives: spiral turns and the number of braided
        chapter strands (one strand per chapter, offset radially).
      - per-chapter event count drives: planet radius, shell density,
        strand thickness and moon-ring richness.
      - the 588-day silence remains a STRUCTURAL VOID: strands only exist
        between consecutive events of the same chapter, so no sparkle is
        ever generated inside the gap.
   2. ONE SINGLE ELEMENT FROM THE INSPIRATION BOARD: the four-point
      twinkle sparkle (the motif shared by the glitter gifs & sparkle
      fields). Everything — stars, planets, rings, moons, arms, knots,
      heart, trails, comets, waves, accretion core — is composed solely
      of that one element, varying only in size, colour and density.
      No meshes, no sprites, no other textures.

   PRESERVED CONTRACT (App.tsx integration, unchanged):
   - chapter planets are navigation objects (planet -> chapter -> content)
   - memory stars map 1:1 to real event ids
   - "06 PLANET CHASING 03" pursuit system with tap-to-scatter
   - public API: constructor / setLabelLayer / setState / setTimeline /
     setQuality / setReducedMotion / pulseReunion / dispose
   ========================================================================= */

import * as THREE from "three";
import { buildPlanetShell, hdPixelRatio, seededDir, sparkMaterial, sparkTextureHD, tuneSparkles, type SparkUniforms } from "./sparkleHD";
import { FX, TUNING, effectiveFx, type FxTier } from "./fx/config";
import { Fireflies, PointerTrail, ShootingStars } from "./fx/effects";
import { EXP, VOID_RULE } from "./fx/config";
import { Expansion, voidClearance, type Discoverable, type ExpFrame, type ExpLayout, type SatInput } from "./fx/expansion";
export type { Discoverable, SatInput } from "./fx/expansion";
import {
  CHAPTERS,
  EVENTS,
  FIRST_DATE,
  LAST_DATE,
  SILENCE_END,
  SILENCE_START,
  RELATIONSHIP_START,
  parseISO,
  type ChapterId,
} from "@/data/canonicalTimeline";

/* --------------------------------------------------- upgrade helpers -- */

const UP_AXIS = new THREE.Vector3(0, 1, 0);

function localISO(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Visual-only metadata from the memory store (favourites, media counts). */
export type StarMeta = { favorite?: boolean; media?: number };

/** Top-down layout for the minimap (same positions as the 3D scene). */
export type GalaxyLayout = {
  extent: number;
  stars: { id: string; chapterId: ChapterId; x: number; z: number; color: string }[];
  planets: { id: ChapterId; index: number; title: string; x: number; z: number; color: string }[];
  voidArc: [number, number][];
};

type LabelSt = { x: number; y: number; d: number; w: number; h: number; visible: boolean; hidden: boolean; op: number };

export type GalaxyState =
  | "entrance"
  | "observatory"
  | "chapter"
  | "journey"
  | "silence"
  | "reunion"
  | "present";

export type QualityTier = "high" | "medium" | "low";

export type PickInfo =
  | { kind: "event"; id: string; title: string; x: number; y: number; via?: "satellite" }
  | { kind: "chapter"; id: string; title: string; x: number; y: number }
  | { kind: "system"; id: string; title: string; x: number; y: number }
  | { kind: "void"; id: string; title: string; x: number; y: number }
  | { kind: "discovery"; id: string; title: string; x: number; y: number }
  | { kind: "ufo"; id: string; title: string; x: number; y: number };

export type SceneOptions = {
  tier: QualityTier;
  reducedMotion: boolean;
  onPick: (info: PickInfo) => void;
  onHover: (info: PickInfo | null) => void;
  onStateChange?: (state: GalaxyState) => void;
  /** Frame-time guard: called (never auto-upgrades) when the tier should drop. */
  onAutoDowngrade?: (tier: QualityTier) => void;
};

/* ------------------------------------------------------------- palette -- */

const VOID = 0x020207;
const MAGENTA = new THREE.Color("#ff4fd8");
const PINK = new THREE.Color("#ff9ee8");
const VIOLET = new THREE.Color("#a06bff");
const PERIWINKLE = new THREE.Color("#8f9bff");
const CYAN = new THREE.Color("#6ff2ff");
const GOLD = new THREE.Color("#ffc46b");
const WHITE = new THREE.Color("#fff6ff");

/* ------------------------------------- the galaxy develops from counts -- */

const N_EVENTS = EVENTS.length; // 52
const N_CHAPTERS = CHAPTERS.length; // 7
const T0 = parseISO(FIRST_DATE);
const T1 = parseISO(LAST_DATE);
const SIL_A = (parseISO(SILENCE_START) - T0) / (T1 - T0);
const SIL_B = (parseISO(SILENCE_END) - T0) / (T1 - T0);

const TURNS = 1.9 + N_CHAPTERS * 0.065; // 7 chapters -> ~2.35 turns
const R_IN = 16;
const R_OUT = 68 + N_EVENTS * 0.2; // 52 events -> ~78.4
const LANE_W = 5.2; // radial braid offset per chapter strand

function timeT(date: string): number {
  return (parseISO(date) - T0) / (T1 - T0);
}
function spiralRadius(t: number): number {
  return R_IN + (R_OUT - R_IN) * Math.pow(t, 0.85);
}
function spiralAngle(t: number): number {
  return t * TURNS * Math.PI * 2;
}
/** chapter strand: the time spiral, offset radially per chapter index */
function laneOffset(chapterIndex: number): number {
  return (chapterIndex - (N_CHAPTERS - 1) / 2) * LANE_W;
}

/* ----------------------------------------------------------------- rng -- */

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

/* =========================================== THE ONE ELEMENT: sparkle == */

/* The sparkle is now drawn analytically in HD — see ./sparkleHD.ts */

/* --------------------------------------------------- sparkle point cloud */



class CloudBuilder {
  pos: number[] = [];
  col: number[] = [];
  size: number[] = [];
  phase: number[] = [];
  speed: number[] = [];
  alpha: number[] = [];
  push(p: THREE.Vector3, c: THREE.Color, size: number, alpha: number, rnd: () => number) {
    this.pos.push(p.x, p.y, p.z);
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

/* ------------------------------------------------------------ pick entry */

type PickEntry = {
  center: THREE.Vector3;
  radius: number;
  info: { kind: PickInfo["kind"]; id: string; title: string; via?: "satellite" };
};

/* ================================================================ SCENE == */

export class GalaxyScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private opts: SceneOptions;
  private clock = new THREE.Clock();
  private raf = 0;
  private ro?: ResizeObserver;

  private world = new THREE.Group();
  private disposables: { dispose: () => void }[] = [];
  private baseDisposables: { dispose: () => void }[] = [];
  private materials: { mat: THREE.ShaderMaterial; u: SparkUniforms; tw: number }[] = [];

  private tier: QualityTier;
  private reduced: boolean;
  private state: GalaxyState = "entrance";

  private texSpark!: THREE.Texture;

  /* camera rig */
  private camPos = new THREE.Vector3(0, 120, 240);
  private camWant = new THREE.Vector3(0, 96, 210);
  private lookAt = new THREE.Vector3(0, 0, 0);
  private lookWant = new THREE.Vector3(0, 0, 0);
  private orbitAz = 0.6;

  /* interaction */
  private pointerNDC = new THREE.Vector2(-10, -10);
  private pointerXY = { x: -1, y: -1 };
  private downAt: { x: number; y: number; t: number } | null = null;
  private raycaster = new THREE.Raycaster();
  private picks: PickEntry[] = [];
  private hoveredId: string | null = null;

  /* celestial objects */
  private planets = new Map<
    ChapterId,
    {
      group: THREE.Group;
      center: THREE.Vector3;
      radius: number;
      moons: THREE.Points;
      moonBase: Float32Array;
      moonData: { r: number; speed: number; phase: number; tilt: number }[];
    }
  >();
  private starPoints!: THREE.Points;
  private starBase!: Float32Array;
  private starCluster!: THREE.Points;
  private clusterBase!: Float32Array;
  private clusterRange!: { start: number; count: number }[];
  private eventPos = new Map<string, THREE.Vector3>();

  /* chasing pair */
  private chaseGroup = new THREE.Group();
  private chaseLeader = new THREE.Group();
  private chaseChaser = new THREE.Group();
  private chaseAngle = 0;
  private chaseScatter = 0;
  private chaseKickL = 0;
  private chaseKickC = 0;
  private trail!: THREE.Points;
  private trailPos!: Float32Array;
  private trailCol!: Float32Array;
  private trailSize!: Float32Array;
  private trailAlpha!: Float32Array;
  private trailHead = 0;
  private trailBirth!: Float32Array;

  /* the silence: GIANT black hole — detailed world with accretion disc, photon rings, corona, jets */
  private holeGroup = new THREE.Group();
  private holeDiskGroup = new THREE.Group();
  private holeHaloGroup = new THREE.Group();
  private holeDisk!: THREE.Points;
  private holeDiskU!: SparkUniforms;
  private holeHaloU!: SparkUniforms;
  private holeExtraUs: SparkUniforms[] = [];
  private diskR!: Float32Array;
  private diskA!: Float32Array;
  private diskY!: Float32Array;
  private diskBase!: Float32Array;
  private holeFlare = 0;
  private holeCenter = new THREE.Vector3();

  /* heart core */
  private heart!: THREE.Points;
  private heartU!: SparkUniforms;
  private heartPulse = 0;

  /* reunion waves */
  private waves: { pts: THREE.Points; u: SparkUniforms; t: number; max: number }[] = [];

  /* comets */
  private comets: { pts: THREE.Points; phase: number; R: number; H: number; tilt: number; speed: number; jit: Float32Array }[] = [];

  /* labels */
  private labelLayer: HTMLElement | null = null;
  private chapterLabels = new Map<ChapterId, HTMLDivElement>();
  private hoverLabel: HTMLDivElement | null = null;

  private revealT: number | null = null;
  private time = 0;

  /* ------------------------------------------------ upgrade state ------ */
  private fxHalo: THREE.Points | null = null;
  private haloBase = new Float32Array(0);
  private haloColBase = new Float32Array(0);
  private satellites: THREE.Points | null = null;
  private satData: { r: number; speed: number; phase: number; tilt: number }[] = [];
  private starRotMats: SparkUniforms[] = [];
  private flareMats: SparkUniforms[] = [];
  private proxMats: SparkUniforms[] = [];
  private driftMats: { u: SparkUniforms; amp: number }[] = [];
  private shimmerMats: SparkUniforms[] = [];
  private mistU: SparkUniforms | null = null;
  private shooting: ShootingStars | null = null;
  private fireflies: Fireflies | null = null;
  private ptrTrail: PointerTrail | null = null;
  private starMeta: Record<string, StarMeta> = {};
  private starIndex = new Map<string, number>();
  private starChapter: number[] = [];
  private upcoming = new Uint8Array(0);
  private revealed = new Uint8Array(0);
  private popAt = new Float32Array(0);
  private pulseAt = new Float32Array(0);
  private pulseAmp = new Float32Array(0);
  private celebrate: number[] = [];
  private celebrateSet = new Set<number>();
  private celebrateNext = 0;
  private heartRate = 1;
  private moodDesat = 0;
  private moodDim = 1;
  private moodTime = 1;
  private mdT = 0;
  private miT = 1;
  private mtT = 1;
  private lastInput = performance.now();
  private idleBlend = 0;
  private idlePhase = 0;
  private parX = 0;
  private parY = 0;
  private hasGyro = false;
  private gyroX = 0;
  private gyroY = 0;
  private gyroAsked = false;
  private pointerMoved = false;
  private labelState = new Map<ChapterId, LabelSt>();
  private labelIds: ChapterId[] = CHAPTERS.map((c) => c.id);
  private labelKept: ChapterId[] = [];
  private labelFrame = 0;
  private ftAvg = 16;
  private ftSlowFor = 0;
  private ftCooldown = 4;
  private tmpV = new THREE.Vector3();
  private tmpV2 = new THREE.Vector3();
  private tmpV3 = new THREE.Vector3();
  private camRight = new THREE.Vector3();
  private camUp = new THREE.Vector3();
  private fwd = new THREE.Vector3();
  private trailPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private byLabelDist = (a: ChapterId, b: ChapterId) => (this.labelState.get(a)?.d ?? 0) - (this.labelState.get(b)?.d ?? 0);

  /* ------------------------------------------------ expansion state ---- */
  private exp: Expansion | null = null;
  private expFrame!: ExpFrame;
  private satInput: SatInput[] = [];
  private foundIds: string[] = [];
  private expOn = true;
  private lifeFlags = { ufo: true, falling: true, discoveries: true };
  private followSat: string | null = null;
  private discoveryFocus: { pos: THREE.Vector3; dist: number } | null = null;
  private hoverTitle = "";
  private shedLevel = 0;
  private pickSphere = new THREE.Sphere();
  private pickHitV = new THREE.Vector3();
  private static showerDone = false;
  /** Called when something new is discovered (set by GalaxyMap). */
  onDiscover?: (id: string) => void;
  /** Called when a golden falling star is caught. */
  onWishCaught?: () => void;
  /** Called when a UFO beam lands on a memory. */
  onUfoBeam?: (eventId: string) => void;

  constructor(canvas: HTMLCanvasElement, opts: SceneOptions) {
    this.canvas = canvas;
    this.opts = opts;
    this.tier = opts.tier;
    this.reduced = opts.reducedMotion;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: opts.tier !== "low",
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(VOID, 1);
    this.renderer.setPixelRatio(hdPixelRatio(this.tier));

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 3000);
    this.camera.position.copy(this.camPos);
    this.scene.add(this.world);

    this.texSpark = sparkTextureHD();
    this.texSpark.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.baseDisposables.push(this.texSpark);

    this.buildWorld();
    this.resize();
    this.applyState(this.state, {});

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);

    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerLeave);

    this.clock.start();
    this.raf = requestAnimationFrame(this.tick);
    (window as unknown as Record<string, unknown>).__galaxy = this;
  }

  /* ------------------------------------------------------- build world -- */

  private mult(): number {
    return this.tier === "high" ? 1 : this.tier === "medium" ? 0.6 : 0.35;
  }

  private buildWorld() {
    const M = this.mult();
    const rnd = rngFor("world");

    /* register the single element texture on every material via factory */
    const mk = (tw: number) => {
      const m = sparkMaterial(tw, this.texSpark);
      this.materials.push({ mat: m.mat, u: m.u, tw });
      return m;
    };

    /* --------------------------------- background twinkle field (events) */
    {
      const b = new CloudBuilder();
      const palette = [MAGENTA, PINK, CYAN, VIOLET, WHITE, WHITE, GOLD];
      const n = Math.round(N_EVENTS * 62 * M);
      for (let i = 0; i < n; i++) {
        const v = seededDir(rnd).multiplyScalar(420 + rnd() * 620);
        const c = palette[Math.floor(rnd() * palette.length)];
        const hero = rnd() < 0.05;
        b.push(v, c, hero ? 3.2 + rnd() * 3.4 : 0.8 + rnd() * 1.6, hero ? 0.95 : 0.45 + rnd() * 0.5, rnd);
      }
      const m = mk(1);
      const pts = new THREE.Points(b.geometry(), m.mat);
      pts.frustumCulled = false;
      this.world.add(pts);
      this.disposables.push(pts.geometry, m.mat);
    }

    /* --------------- chapter strands: one braided spiral lane per chapter */
    {
      const b = new CloudBuilder();
      for (const ch of CHAPTERS) {
        const evs = EVENTS.filter((e) => e.chapterId === ch.id).sort((a, z) => (a.date < z.date ? -1 : 1));
        if (!evs.length) continue;
        const lane = laneOffset(ch.index - 1);
        const atmo = new THREE.Color(ch.visual.atmosphere);
        const base = new THREE.Color(ch.visual.base);
        /* strand stream between consecutive events — silence stays empty
           because no chapter has consecutive events across the gap */
        const perPair = Math.round(95 * M) + Math.round(evs.length * 4 * M);
        for (let i = 0; i < evs.length - 1; i++) {
          const ta = timeT(evs[i].date);
          const tb = timeT(evs[i + 1].date);
          for (let k = 0; k < perPair; k++) {
            const f = k / perPair;
            const t = ta + (tb - ta) * f;
            const a = spiralAngle(t) + (rnd() - 0.5) * 0.05;
            const r = spiralRadius(t) + lane + (rnd() + rnd() - 1) * 3.0;
            const y = (rnd() + rnd() - 1) * 2.8;
            const c = base.clone().lerp(atmo, 0.3 + rnd() * 0.6);
            b.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r), rnd() < 0.1 ? WHITE : c, 0.9 + rnd() * 1.3, 0.45 + rnd() * 0.4, rnd);
            /* arm mass: oversized faint sparkles, same single element */
            if (k % 4 === 0) {
              b.push(new THREE.Vector3(Math.cos(a) * (r + (rnd() - 0.5) * 4), y + (rnd() - 0.5) * 3, Math.sin(a) * (r + (rnd() - 0.5) * 4)), atmo.clone(), 4.0 + rnd() * 3.4, 0.09 + rnd() * 0.08, rnd);
            }
          }
        }
        /* tail beyond the chapter's last event (short fade) */
        {
          const tl = timeT(evs[evs.length - 1].date);
          for (let k = 0; k < Math.round(18 * M); k++) {
            const t = tl + (k / (18 * M)) * 0.012;
            const a = spiralAngle(t) + (rnd() - 0.5) * 0.05;
            const r = spiralRadius(t) + lane + (rnd() + rnd() - 1) * 2.2;
            b.push(new THREE.Vector3(Math.cos(a) * r, (rnd() + rnd() - 1) * 2.4, Math.sin(a) * r), atmo.clone(), 0.7 + rnd() * 0.8, 0.3 * (1 - k / (18 * M)), rnd);
          }
        }
      }
      /* bridges: faint continuity between consecutive chapters —
         never across the 588-day silence, which stays a structural void */
      for (let ci = 0; ci < CHAPTERS.length - 1; ci++) {
        const prev = EVENTS.filter((e) => e.chapterId === CHAPTERS[ci].id).sort((x, y) => (x.date < y.date ? -1 : 1));
        const next = EVENTS.filter((e) => e.chapterId === CHAPTERS[ci + 1].id).sort((x, y) => (x.date < y.date ? -1 : 1));
        if (!prev.length || !next.length) continue;
        const lastPrev = prev[prev.length - 1];
        const firstNext = next[0];
        if (lastPrev.date <= SILENCE_START && firstNext.date >= SILENCE_START) continue; // the void stays empty
        const ta = timeT(lastPrev.date);
        const tb = timeT(firstNext.date);
        const laneA = laneOffset(CHAPTERS[ci].index - 1);
        const laneB = laneOffset(CHAPTERS[ci + 1].index - 1);
        const atmoA = new THREE.Color(CHAPTERS[ci].visual.atmosphere);
        const atmoB = new THREE.Color(CHAPTERS[ci + 1].visual.atmosphere);
        const n = Math.round(46 * M);
        for (let k2 = 0; k2 < n; k2++) {
          const f = k2 / n;
          const t = ta + (tb - ta) * f;
          const a = spiralAngle(t) + (rnd() - 0.5) * 0.05;
          const r = spiralRadius(t) + laneA + (laneB - laneA) * f + (rnd() + rnd() - 1) * 2.4;
          const c = atmoA.clone().lerp(atmoB, f);
          b.push(new THREE.Vector3(Math.cos(a) * r, (rnd() + rnd() - 1) * 2.4, Math.sin(a) * r), c, 0.7 + rnd() * 0.8, 0.16 + rnd() * 0.16, rnd);
        }
      }
      const m = mk(0.85);
      const pts = new THREE.Points(b.geometry(), m.mat);
      pts.frustumCulled = false;
      this.world.add(pts);
      this.disposables.push(pts.geometry, m.mat);
    }

    /* ------------------------------------------------------- memory stars */
    {
      const sb = new CloudBuilder();
      const cb = new CloudBuilder();
      this.clusterRange = [];
      for (const ev of EVENTS) {
        const t = timeT(ev.date);
        const ch = CHAPTERS.find((c) => c.id === ev.chapterId)!;
        const lane = laneOffset(ch.index - 1);
        const a = spiralAngle(t);
        const r = spiralRadius(t) + lane;
        const p = new THREE.Vector3(Math.cos(a) * r, 2.2, Math.sin(a) * r);
        this.eventPos.set(ev.id, p);
        this.picks.push({ center: p, radius: 3.1, info: { kind: "event", id: ev.id, title: ev.title } });
        const col = new THREE.Color(ch.visual.atmosphere);
        sb.push(p, col.clone().lerp(WHITE, 0.35), 5.4, 1.0, rnd);
        /* knot richness scales with the chapter's event count */
        const knot = Math.round((18 + EVENTS.filter((e) => e.chapterId === ch.id).length * 1.6) * M);
        const start = cb.count;
        for (let i = 0; i < knot; i++) {
          const off = seededDir(rnd).multiplyScalar(0.6 + rnd() * 2.1);
          cb.push(p.clone().add(off), col.clone().lerp(PINK, rnd() * 0.5), 1.0 + rnd() * 1.4, 0.7 + rnd() * 0.3, rnd);
        }
        this.clusterRange.push({ start, count: cb.count - start });
      }
      const mS = mk(1);
      this.starPoints = new THREE.Points(sb.geometry(), mS.mat);
      this.starBase = new Float32Array(this.starPoints.geometry.getAttribute("aSize").array);
      this.starPoints.frustumCulled = false;
      this.world.add(this.starPoints);
      this.disposables.push(this.starPoints.geometry, mS.mat);

      const mC = mk(0.9);
      this.starCluster = new THREE.Points(cb.geometry(), mC.mat);
      this.clusterBase = new Float32Array(this.starCluster.geometry.getAttribute("aSize").array);
      this.starCluster.frustumCulled = false;
      this.world.add(this.starCluster);
      this.disposables.push(this.starCluster.geometry, mC.mat);

      /* constellation chords as sparse sparkle chains (same one element) */
      const lb = new CloudBuilder();
      for (const ch of CHAPTERS) {
        const evs = EVENTS.filter((e) => e.chapterId === ch.id).sort((x, y) => (x.date < y.date ? -1 : 1));
        const col = new THREE.Color(ch.visual.atmosphere);
        for (let i = 0; i < evs.length - 1; i++) {
          const a = this.eventPos.get(evs[i].id)!;
          const b2 = this.eventPos.get(evs[i + 1].id)!;
          for (let k = 1; k < 10; k++) {
            const f = k / 10;
            lb.push(a.clone().lerp(b2, f).add(new THREE.Vector3(0, 0.4, 0)), col.clone().lerp(WHITE, 0.3), 0.5 + rnd() * 0.4, 0.3 + rnd() * 0.2, rnd);
          }
        }
      }
      const mL = mk(0.6);
      const lpts = new THREE.Points(lb.geometry(), mL.mat);
      lpts.frustumCulled = false;
      this.world.add(lpts);
      this.disposables.push(lpts.geometry, mL.mat);
    }

    /* ------------------- chapter planets: sparkle spheres sized by events */
    for (const ch of CHAPTERS) {
      const evs = EVENTS.filter((e) => e.chapterId === ch.id);
      const tMid = evs.length
        ? evs.reduce((s, e) => s + timeT(e.date), 0) / evs.length
        : (SIL_A + SIL_B) / 2;
      const a = spiralAngle(tMid) + 0.35;
      const r = spiralRadius(tMid) + laneOffset(ch.index - 1) + 6;
      const lift = evs.length === 0 ? -7 : 9 + (ch.index % 3) * 5;
      const center = new THREE.Vector3(Math.cos(a) * r, lift, Math.sin(a) * r);
      /* radius develops from the chapter's event count */
      const radius = 2.0 + Math.sqrt(Math.max(1, evs.length)) * 0.62;
      const group = new THREE.Group();
      group.position.copy(center);
      this.world.add(group);

      const base = new THREE.Color(ch.visual.base);
      const atmo = new THREE.Color(ch.visual.atmosphere);

      /* glitter shell — the one element, spherically distributed */
      {
        const b = new CloudBuilder();
        /* HD body: seeded shell + rim heroes + halo, micro-glitter skin and
           inner glow, lit by the galactic core (shared with chapter covers) */
        buildPlanetShell(b, {
          id: ch.id,
          radius,
          base,
          atmo,
          white: WHITE,
          events: evs.length,
          M,
          rng: rngFor,
          rim: FX[this.tier].planetRim,
        });
        const m = mk(0.9);
        const pts = new THREE.Points(b.geometry(), m.mat);
        pts.frustumCulled = false;
        group.add(pts);
        this.disposables.push(pts.geometry, m.mat);
      }

      /* ring = sparkle band (only where the data grants a ring) */
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
        const m = mk(0.7);
        const pts = new THREE.Points(b.geometry(), m.mat);
        pts.frustumCulled = false;
        group.add(pts);
        this.disposables.push(pts.geometry, m.mat);
      } else if (ch.visual.glow < 0.4) {
        /* the darkest chapter keeps a lavender crescent of sparkles */
        const b = new CloudBuilder();
        const rr = rngFor("cres-" + ch.id);
        for (let i = 0; i < Math.round(220 * M); i++) {
          const ca = rr() * Math.PI * 1.2;
          const v = new THREE.Vector3(Math.cos(ca) * radius * 3.1, (rr() - 0.5) * 0.4, Math.sin(ca) * radius * 3.1);
          v.applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.5);
          b.push(v, new THREE.Color("#c9a6ff"), 0.7 + rr() * 0.6, 0.55 + rr() * 0.35, rr);
        }
        const m = mk(0.8);
        const pts = new THREE.Points(b.geometry(), m.mat);
        pts.frustumCulled = false;
        group.add(pts);
        this.disposables.push(pts.geometry, m.mat);
      }

      /* moons: sparkle clusters (count from data) */
      const moonData: { r: number; speed: number; phase: number; tilt: number }[] = [];
      {
        const b = new CloudBuilder();
        const rr = rngFor("moons-" + ch.id);
        for (let mI = 0; mI < ch.visual.moons; mI++) {
          const md = { r: radius * (2.6 + mI * 0.9 + rr() * 0.6), speed: 0.25 + rr() * 0.3, phase: rr() * Math.PI * 2, tilt: (rr() - 0.5) * 0.9 };
          moonData.push(md);
          for (let i = 0; i < Math.round(70 * M); i++) {
            const off = seededDir(rr).multiplyScalar(0.5 + rr() * 0.5);
            b.push(off, atmo.clone().lerp(WHITE, 0.4), 0.7 + rr() * 0.7, 0.7 + rr() * 0.3, rr);
          }
        }
        const m = mk(1);
        const pts = new THREE.Points(b.geometry(), m.mat);
        pts.frustumCulled = false;
        group.add(pts);
        this.disposables.push(pts.geometry, m.mat);
        this.planets.set(ch.id, {
          group,
          center,
          radius,
          moons: pts,
          moonBase: new Float32Array(pts.geometry.getAttribute("position").array as Float32Array),
          moonData,
        });
      }

      this.picks.push({ center, radius: radius * 1.9, info: { kind: "chapter", id: ch.id, title: ch.title } });
    }

    /* ------------------------- core: sparkle bulge + accretion sparkle ring */
    {
      const b = new CloudBuilder();
      const bulgeN = Math.round(N_EVENTS * 26 * M);
      for (let i = 0; i < bulgeN; i++) {
        const r = Math.abs(rnd() + rnd() - 1) * 10;
        const a = rnd() * Math.PI * 2;
        const y = (rnd() + rnd() - 1) * 5;
        const c = PINK.clone().lerp(VIOLET, rnd());
        b.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r), c, 0.8 + rnd() * 1.2, 0.4 + rnd() * 0.35, rnd);
      }
      /* accretion: two sparkle rings hugging the core (the one element) */
      for (const [rr2, col, alpha] of [
        [10.5, VIOLET.clone().lerp(MAGENTA, 0.4), 0.85],
        [16, PERIWINKLE.clone(), 0.5],
      ] as const) {
        const n = Math.round(240 * M);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + rnd() * 0.05;
          const jr = rr2 + (rnd() + rnd() - 1) * 1.1;
          b.push(new THREE.Vector3(Math.cos(a) * jr, (rnd() - 0.5) * 0.8, Math.sin(a) * jr), col.clone().lerp(WHITE, rnd() * 0.25), 1.0 + rnd() * 1.0, alpha * (0.6 + rnd() * 0.4), rnd);
        }
      }
      const m = mk(0.9);
      const pts = new THREE.Points(b.geometry(), m.mat);
      pts.frustumCulled = false;
      this.world.add(pts);
      this.disposables.push(pts.geometry, m.mat);
    }

    /* ============ THE SILENCE: a black hole seated in the 588-day void ==
       The only mesh in the scene is the shadow itself — everything else
       (disc, photon ring, flare) is the one sparkle element.            */
    {
      const mid = (SIL_A + SIL_B) / 2;
      const ha = spiralAngle(mid);
      const hr = spiralRadius(mid);
      this.holeCenter.set(Math.cos(ha) * hr, 2, Math.sin(ha) * hr);
      this.holeGroup.position.copy(this.holeCenter);
      this.world.add(this.holeGroup);

      /* the shadow: true void, occludes every sparkle behind it — GIANT SILENCE PLANET */
      const vg = new THREE.SphereGeometry(12, 64, 48);
      const vm = new THREE.MeshBasicMaterial({ color: 0x000000 });
      this.holeGroup.add(new THREE.Mesh(vg, vm));
      this.disposables.push(vg, vm);

      /* GIANT disc frame — posed so near side sweeps across lower face, far side behind top.
         Larger camera offset (58 vs 36) to frame the 12-radius giant. */
      const HOLE_R = 12;
      const silTarget = new THREE.Vector3(Math.cos(ha) * hr, 0, Math.sin(ha) * hr);
      const silDir = silTarget.clone().setY(0).normalize();
      const silCam = silTarget.clone().add(silDir.multiplyScalar(58)).add(new THREE.Vector3(0, 18, 0));
      const fwd = silCam.clone().sub(this.holeCenter).normalize();
      const right0 = new THREE.Vector3(0, 1, 0).cross(fwd).normalize();
      const upP = fwd.clone().cross(right0).normalize();
      const open = 1.12;
      const nrm = fwd.clone().multiplyScalar(Math.cos(open)).addScaledVector(upP, Math.sin(open));
      const xA = right0.clone();
      const zA = xA.clone().cross(nrm).normalize();
      xA.applyAxisAngle(nrm, 0.14);
      zA.applyAxisAngle(nrm, 0.14);
      const bm = new THREE.Matrix4().makeBasis(xA, nrm, zA);
      this.holeDiskGroup.quaternion.setFromRotationMatrix(bm);
      this.holeGroup.add(this.holeDiskGroup);
      this.holeGroup.add(this.holeHaloGroup);
      this.holeExtraUs = [];

      const n = Math.round(6800 * M);
      this.diskR = new Float32Array(n);
      this.diskA = new Float32Array(n);
      this.diskY = new Float32Array(n);
      this.diskBase = new Float32Array(n);
      const pos = new Float32Array(n * 3);
      const col = new Float32Array(n * 3);
      const size = new Float32Array(n);
      const alpha = new Float32Array(n);
      const ph = new Float32Array(n);
      const spd = new Float32Array(n);
      const rr = rngFor("hole-disk-giant");
      const COLD = new THREE.Color("#8aa0c0");
      const WARM = new THREE.Color("#ffe9b0");
      for (let i = 0; i < n; i++) {
        const roll = rr();
        let r: number;
        let band: 0 | 1 | 2 | 3;
        if (roll < 0.16) {
          band = 0;
          r = HOLE_R + 0.35 + Math.pow(rr(), 0.9) * 1.8 + rr() * 0.3;
        } else if (roll < 0.46) {
          band = 1;
          r = HOLE_R + 1.8 + Math.pow(rr(), 0.72) * 9.2;
        } else if (roll < 0.8) {
          band = 2;
          r = 23 + Math.pow(rr(), 0.78) * 13;
        } else {
          band = 3;
          r = 36 + Math.pow(rr(), 0.85) * 12 + rr() * 1.5;
        }
        let a = rr() * Math.PI * 2;
        if (band >= 2) {
          const spiral = Math.log(Math.max(1, r - 8)) * 1.6;
          a += spiral * (band === 2 ? 1 : 0.7);
          if (rr() < 0.5) a += Math.PI;
        }
        this.diskR[i] = r;
        this.diskA[i] = a;
        const thickness = band === 0 ? 0.22 : band === 1 ? 0.45 + (r - HOLE_R) * 0.06 : band === 2 ? 0.7 + (r - 23) * 0.09 : 1.1 + (r - 36) * 0.14;
        this.diskY[i] = (rr() - 0.5) * thickness + (rr() < 0.12 ? (rr() - 0.5) * 1.8 : 0);
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = this.diskY[i];
        pos[i * 3 + 2] = Math.sin(a) * r;

        const isHot = rr() < 0.045;
        const isClump = band === 3 && rr() < 0.28;
        let c: THREE.Color;
        if (band === 0) c = WHITE.clone().lerp(GOLD, rr() * 0.25).lerp(WARM, 0.35);
        else if (band === 1) c = WHITE.clone().lerp(VIOLET, 0.18 + rr() * 0.35).lerp(MAGENTA, rr() * 0.35).lerp(GOLD, rr() * 0.12);
        else if (band === 2) c = VIOLET.clone().lerp(MAGENTA, 0.25 + rr() * 0.5).lerp(PERIWINKLE, rr() * 0.3).lerp(WHITE, rr() * 0.12);
        else c = PERIWINKLE.clone().lerp(COLD, 0.4 + rr() * 0.4).lerp(WHITE, rr() * 0.08);
        if (isHot) c = WHITE.clone().lerp(GOLD, 0.15);
        if (isClump) c.lerp(WHITE, 0.22);

        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;

        const armPhase = (a * 2 + Math.log(r) * 3.2) % (Math.PI * 2);
        const inArm = Math.sin(armPhase) > 0.62 ? 1.28 : 1;

        if (band === 0) size[i] = (1.6 + rr() * 1.8) * (isHot ? 1.8 : 1) * inArm;
        else if (band === 1) size[i] = (1.15 + rr() * 1.3) * (isHot ? 1.6 : 1) * inArm;
        else if (band === 2) size[i] = (0.85 + rr() * 1.1) * (isHot ? 1.5 : 1) * inArm;
        else size[i] = (0.6 + rr() * 1.0) * (isClump ? 1.6 : 1) * inArm;

        if (band === 0) this.diskBase[i] = 0.92 + rr() * 0.18;
        else if (band === 1) this.diskBase[i] = 0.62 + rr() * 0.32 + (isHot ? 0.18 : 0);
        else if (band === 2) this.diskBase[i] = 0.42 + rr() * 0.32;
        else this.diskBase[i] = (isClump ? 0.38 : 0.18) + rr() * 0.22;

        alpha[i] = this.diskBase[i];
        ph[i] = rr() * Math.PI * 2;
        spd[i] = (band === 0 ? 1.2 : band === 1 ? 0.8 : 0.45) + rr() * 0.9;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
      g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
      g.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
      g.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
      g.setAttribute("aSpeed", new THREE.BufferAttribute(spd, 1));
      const dm = mk(0.38);
      this.holeDiskU = dm.u;
      this.holeDisk = new THREE.Points(g, dm.mat);
      this.holeDisk.frustumCulled = false;
      this.holeDiskGroup.add(this.holeDisk);
      this.disposables.push(g, dm.mat);

      // --- GIANT DETAILED HALO SYSTEM — multiple photon rings, corona, jets, infall ---
      const addHaloLayer = (
        key: string,
        builder: (b: CloudBuilder, rng: () => number) => void,
        tw: number,
        holder: THREE.Group
      ) => {
        const cb = new CloudBuilder();
        const rgen = rngFor(key);
        builder(cb, rgen);
        const mm = mk(tw);
        const pts = new THREE.Points(cb.geometry(), mm.mat);
        pts.frustumCulled = false;
        holder.add(pts);
        this.disposables.push(pts.geometry, mm.mat);
        this.holeExtraUs.push(mm.u);
        return { pts, u: mm.u };
      };

      // primary photon ring — razor thin, ultra bright, lensed blaze over top
      const primary = addHaloLayer(
        "hole-halo-primary-giant",
        (b, rgen) => {
          for (let i = 0; i < Math.round(1500 * M); i++) {
            const th = rgen() * Math.PI * 2;
            const R = 12.35 + rgen() * 0.55 + rgen() * 0.18;
            const v = new THREE.Vector3(Math.cos(th) * R, Math.sin(th) * R, (rgen() - 0.5) * 0.55);
            const c = WHITE.clone().lerp(GOLD, 0.18).lerp(VIOLET, 0.08 + rgen() * 0.18);
            const top = 0.5 + 0.5 * Math.sin(th);
            const blaze = Math.pow(top, 1.6);
            b.push(v, c, 0.9 + rgen() * 1.2 + blaze * 1.1, 0.32 + 0.68 * blaze + rgen() * 0.12, rgen);
          }
        },
        0.55,
        this.holeHaloGroup
      );
      this.holeHaloU = primary.u;

      addHaloLayer(
        "hole-halo-secondary-giant",
        (b, rgen) => {
          for (let i = 0; i < Math.round(1100 * M); i++) {
            const th = rgen() * Math.PI * 2;
            const R = 14.1 + rgen() * 0.9 + rgen() * 0.4;
            const v = new THREE.Vector3(Math.cos(th) * R, Math.sin(th) * R, (rgen() - 0.5) * 0.9);
            const c = WHITE.clone().lerp(PERIWINKLE, 0.35 + rgen() * 0.3).lerp(VIOLET, 0.2);
            const top = 0.5 + 0.5 * Math.sin(th);
            b.push(v, c, 0.7 + rgen() * 0.9 + top * 0.5, 0.14 + 0.42 * Math.pow(top, 1.3) + rgen() * 0.08, rgen);
          }
        },
        0.45,
        this.holeHaloGroup
      );

      addHaloLayer(
        "hole-halo-vertical-giant",
        (b, rgen) => {
          for (let i = 0; i < Math.round(1800 * M); i++) {
            const th = rgen() * Math.PI * 2;
            const R = 12.6 + rgen() * 1.8;
            const v = new THREE.Vector3(Math.cos(th) * R, Math.sin(th) * R, (rgen() - 0.5) * 1.1);
            const c = WHITE.clone().lerp(VIOLET, 0.18 + rgen() * 0.45);
            const top = 0.5 + 0.5 * Math.sin(th);
            b.push(v, c, 0.75 + rgen() * 1.1 + top * 0.7, 0.18 + 0.58 * Math.pow(top, 1.35) + rgen() * 0.1, rgen);
          }
        },
        0.5,
        this.holeHaloGroup
      );

      addHaloLayer(
        "hole-corona-giant",
        (b, rgen) => {
          for (let i = 0; i < Math.round(1100 * M); i++) {
            const dir = seededDir(rgen);
            const rad = 13.2 + Math.pow(rgen(), 0.7) * 9.5;
            const v = dir.multiplyScalar(rad);
            const c = i % 3 === 0 ? GOLD.clone() : i % 3 === 1 ? VIOLET.clone().lerp(MAGENTA, 0.4) : PERIWINKLE.clone();
            const a = 0.04 + rgen() * 0.07 + (rad < 15 ? 0.05 : 0);
            b.push(v, c.clone().lerp(WHITE, rgen() * 0.18), 2.2 + rgen() * 3.2, a, rgen);
          }
        },
        0.28,
        this.holeGroup
      );

      // polar jets
      {
        const jetUp = new CloudBuilder();
        const jetDown = new CloudBuilder();
        const rJet = rngFor("hole-jets-giant");
        for (let j = 0; j < 2; j++) {
          const cb = j === 0 ? jetUp : jetDown;
          const sign = j === 0 ? 1 : -1;
          for (let i = 0; i < Math.round(700 * M); i++) {
            const dist = HOLE_R + 1.2 + Math.pow(rJet(), 0.65) * 22;
            const cone = (dist - HOLE_R) * 0.12 + rJet() * 0.9;
            const ang = rJet() * Math.PI * 2;
            const local = new THREE.Vector3()
              .addScaledVector(nrm, sign * dist)
              .addScaledVector(xA, Math.cos(ang) * cone)
              .addScaledVector(zA, Math.sin(ang) * cone);
            local.x += (rJet() - 0.5) * 0.6;
            local.y += (rJet() - 0.5) * 0.6;
            local.z += (rJet() - 0.5) * 0.6;
            const c = j === 0 ? CYAN.clone().lerp(WHITE, 0.3 + rJet() * 0.3).lerp(GOLD, rJet() * 0.18) : VIOLET.clone().lerp(PINK, 0.3).lerp(WHITE, 0.25);
            const fade = Math.max(0, 1 - (dist - HOLE_R) / 24);
            cb.push(local, c, 0.6 + rJet() * 0.9, (0.18 + rJet() * 0.22) * fade * fade, rJet);
          }
        }
        for (const b of [jetUp, jetDown]) {
          const mm = mk(0.5);
          const pts = new THREE.Points(b.geometry(), mm.mat);
          pts.frustumCulled = false;
          this.holeGroup.add(pts);
          this.disposables.push(pts.geometry, mm.mat);
          this.holeExtraUs.push(mm.u);
        }
      }

      // infall streams
      {
        const infall = new CloudBuilder();
        const rIn = rngFor("hole-infall-giant");
        for (let s = 0; s < 6; s++) {
          const startDir = seededDir(rIn);
          const startR = 38 + rIn() * 14;
          const start = startDir.multiplyScalar(startR);
          const endA = rIn() * Math.PI * 2;
          const endR = HOLE_R + 2 + rIn() * 12;
          const end = new THREE.Vector3(Math.cos(endA) * endR, (rIn() - 0.5) * 1.5, Math.sin(endA) * endR);
          for (let k = 0; k < Math.round(90 * M); k++) {
            const t = k / (90 * M);
            const p = start.clone().lerp(end, Math.pow(t, 0.7)).add(new THREE.Vector3((rIn() - 0.5) * 1.2, (rIn() - 0.5) * 1.2, (rIn() - 0.5) * 1.2));
            const local = new THREE.Vector3().addScaledVector(xA, p.x).addScaledVector(nrm, p.y).addScaledVector(zA, p.z);
            const c = PERIWINKLE.clone().lerp(WHITE, 0.2).lerp(new THREE.Color("#8aa0c0"), 0.5);
            infall.push(local, c, 0.5 + rIn() * 0.6, 0.12 + (1 - t) * 0.18, rIn);
          }
        }
        const mm = mk(0.4);
        const pts = new THREE.Points(infall.geometry(), mm.mat);
        pts.frustumCulled = false;
        this.holeDiskGroup.add(pts);
        this.disposables.push(pts.geometry, mm.mat);
        this.holeExtraUs.push(mm.u);
      }

      // inner edge glow
      {
        const innerGlow = new CloudBuilder();
        const rGlow = rngFor("hole-inner-glow");
        for (let i = 0; i < Math.round(900 * M); i++) {
          const th = rGlow() * Math.PI * 2;
          const R = HOLE_R + 0.15 + rGlow() * 0.55;
          const v = new THREE.Vector3(Math.cos(th) * R, (rGlow() - 0.5) * 0.18, Math.sin(th) * R);
          innerGlow.push(v, WHITE.clone().lerp(GOLD, 0.35), 1.1 + rGlow() * 1.2, 0.65 + rGlow() * 0.3, rGlow);
        }
        const mm = mk(0.7);
        const pts = new THREE.Points(innerGlow.geometry(), mm.mat);
        pts.frustumCulled = false;
        this.holeDiskGroup.add(pts);
        this.disposables.push(pts.geometry, mm.mat);
        this.holeExtraUs.push(mm.u);
      }

      // dusty torus
      addHaloLayer(
        "hole-dusty-torus",
        (b, rgen) => {
          for (let i = 0; i < Math.round(800 * M); i++) {
            const th = rgen() * Math.PI * 2;
            const R = 30 + rgen() * 12 + rgen() * 4;
            const y = (rgen() - 0.5) * (2.2 + (R - 30) * 0.12);
            const v = new THREE.Vector3(Math.cos(th) * R, y, Math.sin(th) * R);
            const c = new THREE.Color("#8aa0c0").lerp(PERIWINKLE, rgen() * 0.4);
            b.push(v, c, 0.6 + rgen() * 0.8, 0.08 + rgen() * 0.12, rgen);
          }
        },
        0.32,
        this.holeDiskGroup
      );

      /* navigation: GIANT pick radius */
      this.picks.push({
        center: this.holeCenter,
        radius: 48,
        info: { kind: "void", id: "silence-hole", title: "The Silence · 588 days — a giant world of waiting" },
      });
    }

    /* ------------------------- heart: sparkle mass scaled by event count */
    {
      const b = new CloudBuilder();
      const rr = rngFor("heart");
      const scale = 0.55;
      const heartN = Math.round(N_EVENTS * 50 * M);
      for (let i = 0; i < heartN; i++) {
        const u = rr() * Math.PI * 2;
        const s = Math.sqrt(rr());
        const hx = 16 * Math.pow(Math.sin(u), 3);
        const hy = 13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u);
        const v = new THREE.Vector3(hx * s * scale, hy * s * scale + 26, (rr() - 0.5) * 1.2);
        const c = [VIOLET, CYAN, MAGENTA, PINK][Math.floor(rr() * 4)].clone();
        b.push(v, rr() < 0.1 ? WHITE : c, 0.9 + rr() * 1.1, 0.85 + rr() * 0.15, rr);
      }
      const hm = mk(1);
      this.heartU = hm.u;
      this.heart = new THREE.Points(b.geometry(), hm.mat);
      this.heart.frustumCulled = false;
      this.world.add(this.heart);
      this.disposables.push(this.heart.geometry, hm.mat);
    }

    /* ------------------------------------------------------- chasing pair */
    {
      this.world.add(this.chaseGroup);
      this.chaseGroup.rotation.x = 0.32;
      const mkPair = (color: THREE.Color, r: number, key: string) => {
        const g = new THREE.Group();
        const b = new CloudBuilder();
        const rr = rngFor("chase-" + key);
        for (let i = 0; i < Math.round(620 * M); i++) {
          const v = seededDir(rr).multiplyScalar(r * (1 + rr() * 0.06));
          b.push(v, color.clone().lerp(WHITE, rr() * 0.5), 0.6 + rr() * 0.7, 0.6 + rr() * 0.4, rr);
        }
        const m = mk(1);
        const pts = new THREE.Points(b.geometry(), m.mat);
        pts.frustumCulled = false;
        g.add(pts);
        this.disposables.push(pts.geometry, m.mat);
        return g;
      };
      this.chaseLeader.add(mkPair(new THREE.Color("#b45cff"), 1.7, "leader"));
      this.chaseChaser.add(mkPair(new THREE.Color("#7fe9ff"), 1.45, "chaser"));
      this.chaseGroup.add(this.chaseLeader, this.chaseChaser);

      /* sparkling trail ring-buffer */
      const n = Math.round(480 * M);
      this.trailPos = new Float32Array(n * 3);
      this.trailCol = new Float32Array(n * 3);
      this.trailSize = new Float32Array(n);
      this.trailAlpha = new Float32Array(n);
      this.trailBirth = new Float32Array(n).fill(-100);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(this.trailPos, 3));
      g.setAttribute("aColor", new THREE.BufferAttribute(this.trailCol, 3));
      g.setAttribute("aSize", new THREE.BufferAttribute(this.trailSize, 1));
      g.setAttribute("aAlpha", new THREE.BufferAttribute(this.trailAlpha, 1));
      g.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(n).map(() => Math.random() * 6.28), 1));
      g.setAttribute("aSpeed", new THREE.BufferAttribute(new Float32Array(n).fill(2.2), 1));
      const tm = mk(0.6);
      this.trail = new THREE.Points(g, tm.mat);
      this.trail.frustumCulled = false;
      this.world.add(this.trail);
      this.disposables.push(g, tm.mat);
    }

    /* ------------------------------------------------------- reunion waves */
    for (let w = 0; w < 3; w++) {
      const b = new CloudBuilder();
      const rr = rngFor("wave" + w);
      for (let i = 0; i < 260; i++) {
        const a = (i / 260) * Math.PI * 2;
        const v = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(1 + (rr() - 0.5) * 0.12);
        v.y += (rr() - 0.5) * 0.1;
        b.push(v, [PINK, CYAN, GOLD][i % 3].clone(), 0.7 + rr() * 0.8, 0.8, rr);
      }
      const wm = mk(0.5);
      wm.u.uOpacity.value = 0;
      const pts = new THREE.Points(b.geometry(), wm.mat);
      pts.frustumCulled = false;
      pts.visible = false;
      this.world.add(pts);
      this.waves.push({ pts, u: wm.u, t: -1, max: 58 });
      this.disposables.push(pts.geometry, wm.mat);
    }

    /* ------------------------------------------------------ comet chains */
    {
      const specs = [
        { phase: 0.7, R: 108, H: 26, tilt: 0.5, speed: 0.055, colA: WHITE, colB: CYAN },
        { phase: 3.6, R: 96, H: -34, tilt: -0.4, speed: 0.042, colA: PINK, colB: GOLD },
      ];
      for (const sp of specs) {
        const n = Math.round(150 * M);
        const pos = new Float32Array(n * 3);
        const col = new Float32Array(n * 3);
        const size = new Float32Array(n);
        const alpha = new Float32Array(n);
        const ph = new Float32Array(n);
        const spd = new Float32Array(n).fill(2.4);
        const jit = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const f = 1 - i / n;
          const c = sp.colA.clone().lerp(sp.colB, i / n);
          col[i * 3] = c.r;
          col[i * 3 + 1] = c.g;
          col[i * 3 + 2] = c.b;
          size[i] = 0.5 + f * 1.5;
          alpha[i] = f * f * 0.7;
          ph[i] = i * 0.7;
          jit[i * 3] = (Math.random() - 0.5) * 1.6;
          jit[i * 3 + 1] = (Math.random() - 0.5) * 1.6;
          jit[i * 3 + 2] = (Math.random() - 0.5) * 1.6;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
        g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
        g.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
        g.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
        g.setAttribute("aSpeed", new THREE.BufferAttribute(spd, 1));
        const cm = mk(0.7);
        const cpts = new THREE.Points(g, cm.mat);
        cpts.frustumCulled = false;
        this.world.add(cpts);
        this.comets.push({ pts: cpts, phase: sp.phase, R: sp.R, H: sp.H, tilt: sp.tilt, speed: sp.speed, jit });
        this.disposables.push(g, cm.mat);
      }
    }

    this.buildFx(M, mk);
    this.applyReveal();
  }

  /* ------------------------------------------------------------ helpers -- */

  private clearWorld() {
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
    this.materials = [];
    this.holeExtraUs = [];
    this.world.clear();
    this.planets.clear();
    this.picks = [];
    this.waves = [];
    this.comets = [];
    this.eventPos.clear();
    this.chaseGroup.clear();
    this.chaseLeader.clear();
    this.chaseChaser.clear();
    this.holeGroup.clear();
    this.holeDiskGroup.clear();
    this.holeHaloGroup.clear();
    this.fxHalo = null;
    this.satellites = null;
    this.shooting = null;
    this.fireflies = null;
    this.ptrTrail = null;
    this.mistU = null;
    this.exp = null;
  }

  private resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    tuneSparkles(this.materials, this.renderer, h, this.camera.fov);
  }

  /* -------------------------------------------------------------- labels -- */

  setLabelLayer(el: HTMLElement | null) {
    this.labelLayer = el;
    if (!el) return;
    el.innerHTML = "";
    for (const ch of CHAPTERS) {
      const d = document.createElement("div");
      d.style.cssText = [
        "position:absolute",
        "transform:translate(-50%,-50%)",
        "font:600 11px/1.4 ui-sans-serif,system-ui,sans-serif",
        "letter-spacing:.22em",
        "text-transform:uppercase",
        "white-space:nowrap",
        "pointer-events:none",
        "transition:opacity .35s ease",
        `color:${ch.visual.atmosphere}`,
        "text-shadow:0 0 14px currentColor, 0 0 4px rgba(0,0,0,.9)",
      ].join(";");
      d.textContent = `${String(ch.index).padStart(2, "0")} · ${ch.title}`;
      el.appendChild(d);
      this.chapterLabels.set(ch.id, d);
    }
    this.hoverLabel = document.createElement("div");
    this.hoverLabel.style.cssText = [
      "position:absolute",
      "transform:translate(12px,-24px)",
      "font:500 11px/1.4 ui-sans-serif,system-ui,sans-serif",
      "letter-spacing:.08em",
      "white-space:nowrap",
      "pointer-events:none",
      "color:#ffeafd",
      "text-shadow:0 0 12px rgba(255,79,216,.8), 0 0 3px rgba(0,0,0,.9)",
      "opacity:0",
      "transition:opacity .18s ease",
    ].join(";");
    el.appendChild(this.hoverLabel);
  }

  private updateLabels() {
    if (!this.labelLayer) return;
    const showChapters = this.state === "entrance" || this.state === "observatory" || this.state === "present";
    const fx = this.fxt();
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    const v = this.tmpV;
    const ease = fx.labelEase ? TUNING.labelLerp : 1;
    const measure = ++this.labelFrame % TUNING.labelOverlapEvery === 0;
    for (const ch of CHAPTERS) {
      const el = this.chapterLabels.get(ch.id);
      const planet = this.planets.get(ch.id);
      if (!el || !planet) continue;
      v.copy(planet.center).project(this.camera);
      const front = v.z < 1;
      const x = (v.x * 0.5 + 0.5) * W;
      const y = (-v.y * 0.5 + 0.5) * H - planet.radius * 4 - 16;
      const dist = this.camera.position.distanceTo(planet.center);
      const visible = showChapters && front && dist < 260;
      let st = this.labelState.get(ch.id);
      if (!st) {
        st = { x, y, d: dist, w: 0, h: 0, visible, hidden: false, op: 0 };
        this.labelState.set(ch.id, st);
      }
      // eased position; snap on big cuts so labels never slide across the screen
      if (!front || Math.abs(x - st.x) > W * 0.4 || Math.abs(y - st.y) > H * 0.4) {
        st.x = x;
        st.y = y;
      } else {
        st.x += (x - st.x) * ease;
        st.y += (y - st.y) * ease;
      }
      st.d = dist;
      st.visible = visible;
      st.op = visible ? Math.max(0, Math.min(1, 1.6 - dist / 190)) : 0;
      if (measure) {
        st.w = el.offsetWidth;
        st.h = el.offsetHeight;
      }
      el.style.left = `${st.x.toFixed(1)}px`;
      el.style.top = `${st.y.toFixed(1)}px`;
    }
    // greedy overlap culling (closest label wins), at most every 3 frames
    if (measure) {
      this.labelIds.sort(this.byLabelDist);
      this.labelKept.length = 0;
      for (const id of this.labelIds) {
        const st = this.labelState.get(id);
        if (!st) continue;
        st.hidden = false;
        if (!st.visible || st.op <= 0.02) continue;
        for (const kid of this.labelKept) {
          const k = this.labelState.get(kid);
          if (k && Math.abs(st.x - k.x) < (st.w + k.w) / 2 + 8 && Math.abs(st.y - k.y) < (st.h + k.h) / 2 + 4) {
            st.hidden = true;
            break;
          }
        }
        if (!st.hidden) this.labelKept.push(id);
      }
    }
    for (const ch of CHAPTERS) {
      const el = this.chapterLabels.get(ch.id);
      const st = this.labelState.get(ch.id);
      if (el && st) el.style.opacity = st.visible && !st.hidden ? st.op.toFixed(3) : "0";
    }
    if (this.hoverLabel) {
      const h = this.hoveredId;
      if (h && this.hoverTitle) {
        this.hoverLabel.textContent = this.hoverTitle;
        this.hoverLabel.style.left = `${this.pointerXY.x}px`;
        this.hoverLabel.style.top = `${this.pointerXY.y}px`;
        this.hoverLabel.style.opacity = "1";
      } else {
        this.hoverLabel.style.opacity = "0";
      }
    }
  }

  /* --------------------------------------------------------- interaction -- */

  private onPointerMove = (e: PointerEvent) => {
    this.lastInput = performance.now();
    this.pointerMoved = true;
    const rect = this.canvas.getBoundingClientRect();
    this.pointerXY = { x: e.clientX, y: e.clientY };
    this.pointerNDC.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
  };
  private onPointerDown = (e: PointerEvent) => {
    this.downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
    this.lastInput = performance.now();
    if (e.pointerType === "touch") this.initGyro();
  };
  private onPointerUp = (e: PointerEvent) => {
    if (!this.downAt) return;
    const dx = e.clientX - this.downAt.x;
    const dy = e.clientY - this.downAt.y;
    const dt = performance.now() - this.downAt.t;
    this.downAt = null;
    if (Math.hypot(dx, dy) > 7 || dt > 500) return;
    this.onPointerMove(e); // touch taps fire no pointermove: pick from the tap position
    if (this.catchStar()) return;
    const hit = this.rayPick();
    if (!hit) return;
    if (hit.info.kind === "system") this.scatter();
    else if (hit.info.kind === "void") this.holeFlare = 1;
    else if (hit.info.kind === "event") this.pickRipple(hit.info.id);
    else if (hit.info.kind === "ufo") this.exp?.tapUfo(hit.info.id);
    else if (hit.info.kind === "discovery") this.exp?.markFound(hit.info.id, true);
    this.opts.onPick({ ...hit.info, x: e.clientX, y: e.clientY } as PickInfo);
  };
  private onPointerLeave = () => {
    this.pointerNDC.set(-10, -10);
    if (this.hoveredId) {
      this.hoveredId = null;
      this.opts.onHover(null);
    }
  };

  private rayPick(): PickEntry | null {
    if (this.pointerNDC.x < -1) return null;
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const sphere = this.pickSphere;
    const hit = this.pickHitV;
    let best: PickEntry | null = null;
    const ex = this.exp && this.expOn ? this.exp.pick(this.raycaster.ray, this.camera.position) : null;
    let bestDist = Infinity;
    for (const p of this.picks) {
      if (p.info.kind === "event" && !this.eventVisible(p.info.id)) continue;
      sphere.center.copy(p.center);
      sphere.radius = p.radius;
      if (this.raycaster.ray.intersectSphere(sphere, hit)) {
        const d = this.camera.position.distanceTo(hit);
        if (d < bestDist) {
          bestDist = d;
          best = p;
        }
      }
    }
    // satellites sit inside their planet's generous pick sphere — they win over it
    if (ex && (!best || ex.dist < bestDist || (ex.info.kind === "event" && best.info.kind === "chapter"))) return ex;
    return best;
  }

  private eventVisible(id: string): boolean {
    if (this.revealT == null) return true;
    const ev = EVENTS.find((e) => e.id === id);
    return !!ev && timeT(ev.date) <= this.revealT;
  }

  /* ------------------------------------------------------------- public -- */

  setState(state: GalaxyState, opts: { chapterId?: ChapterId; eventId?: string; via?: "satellite" } = {}) {
    this.state = state;
    this.lastInput = performance.now();
    this.discoveryFocus = null;
    this.applyState(state, opts);
    this.opts.onStateChange?.(state);
  }

  private applyState(state: GalaxyState, opts: { chapterId?: ChapterId; eventId?: string; via?: "satellite" }) {
    const look = this.lookWant;
    const want = this.camWant;
    this.setMoodFor(state);
    if (state !== "journey" && state !== "reunion" && this.followSat) {
      this.followSat = null;
      this.exp?.setFocusSat(null);
    }
    switch (state) {
      case "entrance":
        want.set(Math.cos(this.orbitAz) * 200, 110, Math.sin(this.orbitAz) * 200);
        look.set(0, 0, 0);
        break;
      case "observatory":
        want.set(Math.cos(this.orbitAz) * 118, 52, Math.sin(this.orbitAz) * 118);
        look.set(0, 2, 0);
        break;
      case "chapter": {
        const p = opts.chapterId ? this.planets.get(opts.chapterId) : null;
        if (!p) break;
        const dir = p.center.clone().setY(0).normalize();
        want.copy(p.center).add(dir.multiplyScalar(p.radius * 5.5 + 12)).add(new THREE.Vector3(0, p.radius * 2.2 + 6, 0));
        look.copy(p.center);
        break;
      }
      case "journey":
      case "reunion": {
        const s = opts.eventId ? this.eventPos.get(opts.eventId) : null;
        const ex = this.exp;
        if (opts.eventId && ex && ex.hasSat(opts.eventId) && (opts.via === "satellite" || !s)) {
          // framing target moves: tick() tracks it; its orbit slows while we fly
          this.followSat = opts.eventId;
          ex.setFocusSat(opts.eventId);
          break;
        }
        this.followSat = null;
        ex?.setFocusSat(null);
        if (!s) break;
        const dir = s.clone().setY(0).normalize();
        want.copy(s).add(dir.multiplyScalar(16)).add(new THREE.Vector3(0, 7, 0));
        look.copy(s);
        if (state === "reunion") {
          want.multiplyScalar(1.18);
          look.lerp(new THREE.Vector3(0, 12, 0), 0.35);
        }
        break;
      }
      case "silence": {
        const mid = (SIL_A + SIL_B) / 2;
        const a = spiralAngle(mid);
        const r = spiralRadius(mid);
        const target = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
        const dir = target.clone().setY(0).normalize();
        // GIANT framing: pull back to 68u (was 36) and up to 22u (was 11) so the 12-radius horizon + 48-radius disk reads fully
        want.copy(target).add(dir.multiplyScalar(68)).add(new THREE.Vector3(0, 22, 0));
        look.copy(target).add(new THREE.Vector3(0, 3.5, 0));
        break;
      }
      case "present": {
        /* sit opposite the first chapter planet so the heart reads alone */
        const p01 = this.planets.get(CHAPTERS[0].id);
        const azP = p01 ? Math.atan2(p01.center.z, p01.center.x) : 0;
        const az = azP + Math.PI + Math.sin(this.orbitAz * 0.5) * 0.35;
        want.set(Math.cos(az) * 95, 30, Math.sin(az) * 95);
        look.set(0, 27, 0);
        break;
      }
    }
    // flying to a discovery: frame it from outside, slightly above
    const df = this.discoveryFocus;
    if (df && (state === "observatory" || state === "present" || state === "entrance")) {
      const out = this.tmpV2.set(df.pos.x, 0, df.pos.z);
      if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
      out.normalize();
      want.copy(df.pos).addScaledVector(out, df.dist).add(this.tmpV3.set(0, df.dist * 0.35, 0));
      look.copy(df.pos);
    }
  }

  setTimeline(t: number | null) {
    this.revealT = t;
    this.applyReveal();
  }

  private applyReveal() {
    if (!this.starPoints || !this.starCluster) return;
    /* core star size/alpha are animated per frame in updateStars();
       here we only record reveal changes so new stars "pop" in */
    if (this.revealed.length) {
      const pop = this.fxt().scrubPop;
      EVENTS.forEach((ev, i) => {
        const on = this.eventVisible(ev.id);
        if (on && !this.revealed[i] && pop) this.popAt[i] = this.time;
        this.revealed[i] = on ? 1 : 0;
      });
    }
    const cSize = this.starCluster.geometry.getAttribute("aSize") as THREE.BufferAttribute;
    const cAlpha = this.starCluster.geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
    EVENTS.forEach((ev, i) => {
      const on = this.eventVisible(ev.id);
      const range = this.clusterRange[i];
      for (let k = range.start; k < range.start + range.count; k++) {
        cSize.setX(k, on ? this.clusterBase[k] : 0.0001);
        cAlpha.setX(k, on ? 0.6 : 0);
      }
    });
    cSize.needsUpdate = true;
    cAlpha.needsUpdate = true;
  }

  setQuality(tier: QualityTier) {
    if (tier === this.tier) return;
    this.tier = tier;
    this.renderer.setPixelRatio(hdPixelRatio(tier));
    this.clearWorld();
    this.buildWorld();
    this.resize();
    this.applyState(this.state, {});
  }

  setReducedMotion(reduced: boolean) {
    this.reduced = reduced;
    this.syncFxUniforms();
    this.exp?.setReduced(reduced);
    if (reduced) {
      this.moodDesat = this.mdT;
      this.moodDim = this.miT;
      this.moodTime = this.mtT;
    }
  }

  pulseReunion() {
    const s = this.eventPos.get(`event-${SILENCE_END}`) ?? new THREE.Vector3();
    if (!this.reduced) {
      const wave = this.waves.find((w) => w.t < 0) ?? this.waves[0];
      wave.t = 0;
      wave.max = 58;
      wave.pts.visible = true;
      wave.pts.position.copy(s);
      this.scatterBurstAt(s);
    }
    this.heartPulse = 1;
    this.reunionRelease(s);
    if (!this.reduced && this.expOn && this.lifeFlags.falling && EXP[this.tier].shower) this.shooting?.shower(6, 12, this.time + 0.8);
  }

  private scatterBurstAt(p: THREE.Vector3) {
    for (let i = 0; i < 60; i++) {
      this.emitTrail(p.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(1.5)), 1.6);
    }
  }

  private scatter() {
    this.chaseScatter = 1;
    this.chaseKickL = 2.4;
    this.chaseKickC = -2.0;
    const p = this.chaseChaser.getWorldPosition(new THREE.Vector3());
    this.scatterBurstAt(p);
  }

  /* ---------------------------------------------------------- trail emit -- */

  private emitTrail(at: THREE.Vector3, spread = 0.5) {
    const n = this.trailBirth.length;
    const i = this.trailHead;
    this.trailHead = (this.trailHead + 1) % n;
    const jitter = new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * spread);
    const p = at.clone().add(jitter);
    this.trailPos[i * 3] = p.x;
    this.trailPos[i * 3 + 1] = p.y;
    this.trailPos[i * 3 + 2] = p.z;
    const c = [GOLD, PINK, CYAN, MAGENTA][Math.floor(Math.random() * 4)];
    this.trailCol[i * 3] = c.r;
    this.trailCol[i * 3 + 1] = c.g;
    this.trailCol[i * 3 + 2] = c.b;
    this.trailBirth[i] = this.time;
    this.trailSize[i] = 0.8 + Math.random() * 1.4;
    this.trailAlpha[i] = 0.9;
  }

  private updateTrail(dt: number) {
    const n = this.trailBirth.length;
    for (let i = 0; i < n; i++) {
      const age = this.time - this.trailBirth[i];
      const life = 2.6;
      if (age < 0 || age > life) {
        this.trailAlpha[i] = 0;
        continue;
      }
      const k = 1 - age / life;
      this.trailAlpha[i] = k * k * 0.9;
      this.trailPos[i * 3 + 1] -= dt * 0.6 * k;
    }
    const g = this.trail.geometry;
    (g.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute("aAlpha") as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute("aColor") as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute("aSize") as THREE.BufferAttribute).needsUpdate = true;
  }

  /* ------------------------------------------------------ comet helpers -- */

  private cometPos(c: { phase: number; R: number; H: number; tilt: number }, tc: number, out: THREE.Vector3) {
    const a = c.phase + tc;
    out.set(Math.cos(a) * c.R, Math.sin(a * 1.9) * c.H, Math.sin(a) * c.R);
    out.applyAxisAngle(new THREE.Vector3(0, 0, 1), c.tilt);
    return out;
  }

  private updateComets() {
    const v = new THREE.Vector3();
    for (const c of this.comets) {
      const attr = c.pts.geometry.getAttribute("position") as THREE.BufferAttribute;
      const n = attr.count;
      const tc = this.time * c.speed * (this.reduced ? 0.25 : 1);
      for (let i = 0; i < n; i++) {
        this.cometPos(c, tc - i * 0.018, v);
        attr.setXYZ(i, v.x + c.jit[i * 3], v.y + c.jit[i * 3 + 1], v.z + c.jit[i * 3 + 2]);
      }
      attr.needsUpdate = true;
    }
  }

  /* ----------------------------------------------------------------- tick -- */

  private tick = () => {
    this.raf = requestAnimationFrame(this.tick);
    const dtRaw = Math.min(this.clock.getDelta(), 1);
    const dt = Math.min(dtRaw, 0.05);
    this.frameGuard(dtRaw);
    this.updateMood(dt);
    this.time += dt * this.moodTime;
    const t = this.time;

    for (const { u } of this.materials) {
      u.uTime.value = t;
      u.uDesat.value = this.moodDesat;
      u.uDim.value = this.moodDim;
      u.uPointer.value.copy(this.pointerNDC);
    }

    /* camera orbit + damping */
    if (!this.reduced && (this.state === "entrance" || this.state === "observatory" || this.state === "present")) {
      this.orbitAz += dt * (this.state === "entrance" ? 0.018 : 0.035);
      this.applyState(this.state, {});
    }
    /* follow a moving satellite during its memory journey */
    if (this.followSat && this.exp && (this.state === "journey" || this.state === "reunion")) {
      const p = this.exp.satPos(this.followSat, this.tmpV);
      if (p) {
        this.lookWant.copy(p);
        const out = this.tmpV2.set(p.x, 0, p.z);
        if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
        out.normalize();
        this.camWant.copy(p).addScaledVector(out, 11).add(this.tmpV3.set(0, 5, 0));
      }
    }
    const k = 1 - Math.exp(-dtRaw * 2.6);
    this.camPos.lerp(this.camWant, k);
    this.lookAt.lerp(this.lookWant, k);
    this.applyCameraLife(dtRaw);

    /* moons orbit their planets */
    for (const [, p] of this.planets) {
      const attr = p.moons.geometry.getAttribute("position") as THREE.BufferAttribute;
      const c = new THREE.Vector3();
      p.moonData.forEach((md, m) => {
        const a = md.phase + t * md.speed;
        c.set(Math.cos(a) * md.r, Math.sin(a) * md.r * Math.sin(md.tilt) * 0.4, Math.sin(a) * md.r);
        for (let v = 0; v < attr.count / Math.max(1, p.moonData.length); v++) {
          const idx = m * Math.round(attr.count / p.moonData.length) + v;
          if (idx >= attr.count) break;
          attr.setXYZ(
            idx,
            p.moonBase[idx * 3] + c.x,
            p.moonBase[idx * 3 + 1] + c.y,
            p.moonBase[idx * 3 + 2] + c.z
          );
        }
      });
      attr.needsUpdate = true;
    }

    /* chasing pair */
    {
      const R = R_OUT + 16;
      const speed = this.reduced ? 0.05 : 0.16;
      if (this.chaseScatter > 0) {
        this.chaseScatter = Math.max(0, this.chaseScatter - dt * 0.35);
        this.chaseKickL *= Math.exp(-dt * 1.4);
        this.chaseKickC *= Math.exp(-dt * 1.4);
      }
      this.chaseAngle += dt * speed;
      const gap = 0.5 + Math.sin(t * 0.35) * 0.16;
      const aL = this.chaseAngle + this.chaseKickL * 0.2;
      const aC = this.chaseAngle - gap + this.chaseKickC * 0.2;
      const rL = R + Math.sin(t * 0.22) * 5 + this.chaseScatter * 10;
      const rC = R - 5 + Math.cos(t * 0.27) * 5 - this.chaseScatter * 8;
      this.chaseLeader.position.set(Math.cos(aL) * rL, Math.sin(aL * 2) * 2.5, Math.sin(aL) * rL);
      this.chaseChaser.position.set(Math.cos(aC) * rC, Math.sin(aC * 2) * 2.5, Math.sin(aC) * rC);
      if (!this.reduced) {
        const wp = this.chaseChaser.getWorldPosition(new THREE.Vector3());
        this.emitTrail(wp, 0.55);
      }
      const mid = this.chaseLeader
        .getWorldPosition(new THREE.Vector3())
        .add(this.chaseChaser.getWorldPosition(new THREE.Vector3()))
        .multiplyScalar(0.5);
      let entry = this.picks.find((p) => p.info.kind === "system");
      if (!entry) {
        entry = { center: new THREE.Vector3(), radius: 9, info: { kind: "system", id: "chase-pair", title: "06 PLANET CHASING 03" } };
        this.picks.push(entry);
      }
      entry.center.copy(mid);
    }
    this.updateTrail(dt);
    this.updateComets();

    /* GIANT black hole: keplerian rotation, doppler beaming, lensed halo, flare + extra layers */
    {
      this.holeFlare = Math.max(0, this.holeFlare - dt * 0.7);
      const flare = 1 + this.holeFlare * 1.6;
      const dtH = this.reduced ? dt * 0.25 : dt;
      const pAttr = this.holeDisk.geometry.getAttribute("position") as THREE.BufferAttribute;
      const aAttr = this.holeDisk.geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
      for (let i = 0; i < this.diskR.length; i++) {
        // slightly faster keplerian to keep giant disk lively: 42 vs 26, but still 1/r^1.5
        this.diskA[i] += dtH * 42 / Math.pow(Math.max(10, this.diskR[i]), 1.5);
        const a = this.diskA[i];
        pAttr.setXYZ(i, Math.cos(a) * this.diskR[i], this.diskY[i], Math.sin(a) * this.diskR[i]);
        const beam = 1 + 0.85 * Math.cos(a - 0.35);
        aAttr.setX(i, Math.min(1, this.diskBase[i] * beam * flare));
      }
      pAttr.needsUpdate = true;
      aAttr.needsUpdate = true;
      this.holeDiskU.uOpacity.value = 0.95 + this.holeFlare * 0.55;
      this.holeHaloU.uOpacity.value = 0.85 + this.holeFlare * 0.65;
      for (const u of this.holeExtraUs) u.uOpacity.value = 0.85 + this.holeFlare * 0.5;
      this.holeHaloGroup.rotation.y = Math.atan2(this.camPos.x - this.holeGroup.position.x, this.camPos.z - this.holeGroup.position.z);
      // subtle breathing of the whole giant — scale pulse with flare
      const giantPulse = 1 + this.holeFlare * 0.06 + Math.sin(t * 0.6) * 0.015;
      this.holeGroup.scale.setScalar(giantPulse);
    }

    /* heart pulse */
    {
      const target = this.state === "present" || this.state === "reunion" ? 1 : 0.38;
      this.heartPulse = THREE.MathUtils.damp(this.heartPulse, target, 2.2, dt);
      const beat = this.reduced ? 0 : this.heartBeat(t);
      const s = 1 + this.heartPulse * 0.22 + beat * this.heartPulse;
      this.heart.scale.setScalar(s);
      this.heartU.uOpacity.value = 0.7 + this.heartPulse * 0.3 + beat * 1.4;
      /* billboard the heart toward the camera so its silhouette always reads */
      this.heart.rotation.y =
        Math.atan2(this.camPos.x, this.camPos.z) + (this.reduced ? 0 : Math.sin(t * 0.11) * 0.16);
    }

    /* reunion waves */
    for (const w of this.waves) {
      if (w.t < 0) continue;
      w.t += dt;
      const dur = 2.8;
      const f = w.t / dur;
      if (f >= 1) {
        w.t = -1;
        w.pts.visible = false;
        w.u.uOpacity.value = 0;
        continue;
      }
      const ease = 1 - Math.pow(1 - f, 3);
      w.pts.scale.setScalar(2 + ease * w.max);
      w.u.uOpacity.value = (1 - f) * 0.9;
    }

    this.updateFx(t);

    /* hover */
    {
      const hit = this.rayPick();
      const id = hit ? hit.info.id : null;
      this.hoverTitle = hit ? hit.info.title : "";
      if (id !== this.hoveredId) {
        this.hoveredId = id;
        this.opts.onHover(hit ? ({ ...hit.info, x: this.pointerXY.x, y: this.pointerXY.y } as PickInfo) : null);
        this.canvas.style.cursor = hit ? "pointer" : "";
      }
    }

    this.updateLabels();
    this.renderer.render(this.scene, this.camera);
  };

  /* ======================================================================
     UPGRADE — beautification, ambient life, interaction & story moments.
     Everything below is additive; every tunable lives in ./fx/config.ts.
     ====================================================================== */

  private fxt(): FxTier {
    return effectiveFx(this.tier, this.reduced);
  }

  private buildFx(M: number, mk: (tw: number) => { mat: THREE.ShaderMaterial; u: SparkUniforms }) {
    const fx = FX[this.tier];
    const n = EVENTS.length;
    const today = localISO();
    const track = (d: { dispose: () => void }) => {
      this.disposables.push(d);
    };
    const add = (b: CloudBuilder, tw: number) => {
      const m = mk(tw);
      const pts = new THREE.Points(b.geometry(), m.mat);
      pts.frustumCulled = false;
      this.world.add(pts);
      this.disposables.push(pts.geometry, m.mat);
      return { pts, u: m.u };
    };

    this.starRotMats = [];
    this.flareMats = [];
    this.proxMats = [];
    this.driftMats = [];
    this.shimmerMats = [];
    this.starIndex.clear();
    this.starChapter = [];
    this.upcoming = new Uint8Array(n);
    this.revealed = new Uint8Array(n);
    this.popAt = new Float32Array(n).fill(-99);
    this.pulseAt = new Float32Array(n).fill(-99);
    this.pulseAmp = new Float32Array(n);
    EVENTS.forEach((ev, i) => {
      this.starIndex.set(ev.id, i);
      this.starChapter.push((CHAPTERS.find((c) => c.id === ev.chapterId)?.index ?? 1) - 1);
      this.upcoming[i] = ev.date > today ? 1 : 0;
      this.revealed[i] = this.eventVisible(ev.id) ? 1 : 0;
      // 6.1 seeded size jitter (±12%) — size only, never position
      const jr = rngFor("star-jitter-" + ev.id);
      this.starBase[i] *= 1 + (jr() - 0.5) * 2 * TUNING.starSizeJitter;
    });
    const starU = (this.starPoints.material as THREE.ShaderMaterial).uniforms as unknown as SparkUniforms;
    this.starRotMats.push(starU);
    this.flareMats.push(starU);
    this.proxMats.push(starU);

    /* 6.1 two-layer stars: a faint chapter-coloured halo sparkle behind every core */
    this.fxHalo = null;
    if (fx.halos) {
      const b = new CloudBuilder();
      const hr = rngFor("star-halos");
      for (const ev of EVENTS) {
        const ch = CHAPTERS.find((c) => c.id === ev.chapterId);
        b.push(this.eventPos.get(ev.id) ?? new THREE.Vector3(), new THREE.Color(ch?.visual.atmosphere ?? "#ffffff"), TUNING.haloSize * (0.9 + hr() * 0.2), TUNING.haloAlpha, hr);
      }
      const h = add(b, 0.6);
      this.fxHalo = h.pts;
      this.haloBase = new Float32Array(h.pts.geometry.getAttribute("aSize").array as Float32Array);
      this.haloColBase = new Float32Array(h.pts.geometry.getAttribute("aColor").array as Float32Array);
      this.starRotMats.push(h.u);
      this.proxMats.push(h.u);
    }

    /* 6.1 satellites — memories with photos / videos / voice notes */
    this.satellites = null;
    this.satData = [];
    if (fx.satellites) {
      const b = new CloudBuilder();
      const sr = rngFor("star-satellites");
      for (const ev of EVENTS) {
        b.push(this.eventPos.get(ev.id) ?? new THREE.Vector3(), WHITE, TUNING.satelliteSize, 0, sr);
        this.satData.push({ r: 3.2 + sr() * 1.2, speed: 0.5 + sr() * 0.7, phase: sr() * Math.PI * 2, tilt: (sr() - 0.5) * 1.2 });
      }
      this.satellites = add(b, 0.8).pts;
    }

    /* 6.4 core shimmer — a slow rotating gold spike layer */
    if (fx.coreShimmer) {
      const b = new CloudBuilder();
      const cr = rngFor("core-shimmer");
      for (let i = 0; i < 5; i++) {
        b.push(new THREE.Vector3((cr() - 0.5) * 1.4, (cr() - 0.5) * 0.8, (cr() - 0.5) * 1.4), GOLD.clone().lerp(WHITE, cr() * 0.3), 20 + cr() * 10, 0.25, cr);
      }
      this.shimmerMats.push(add(b, 0.3).u);
    }

    /* 6.3 dust depth layers — along each chapter's own span only (never the void) */
    for (let L = 2; L <= fx.dustLayers; L++) {
      const b = new CloudBuilder();
      const dr = rngFor("dust-layer-" + L);
      const spread = L === 2 ? 5.5 : 8.5;
      const ySpread = L === 2 ? 4 : 7;
      for (const ch of CHAPTERS) {
        const evs = EVENTS.filter((e) => e.chapterId === ch.id).sort((a, z) => (a.date < z.date ? -1 : 1));
        if (evs.length < 2) continue;
        const ta = timeT(evs[0].date);
        const tb = timeT(evs[evs.length - 1].date);
        const lane = laneOffset(ch.index - 1);
        const base = new THREE.Color(ch.visual.base);
        const atmo = new THREE.Color(ch.visual.atmosphere);
        const count = Math.round(((L === 2 ? TUNING.dustLayer2PerChapter : TUNING.dustLayer3PerChapter) + evs.length * TUNING.dustPerEvent) * M);
        for (let k = 0; k < count; k++) {
          const t = ta + (tb - ta) * dr();
          if (t > SIL_A && t < SIL_B) continue; // belt and braces: the void stays empty
          const a = spiralAngle(t) + (dr() - 0.5) * 0.06;
          const r = spiralRadius(t) + lane + (dr() + dr() - 1) * spread;
          b.push(
            new THREE.Vector3(Math.cos(a) * r, (dr() + dr() - 1) * ySpread, Math.sin(a) * r),
            base.clone().lerp(atmo, 0.2 + dr() * 0.6),
            L === 2 ? 0.6 + dr() * 0.5 : 0.5 + dr() * 0.4,
            L === 2 ? 0.12 + dr() * 0.1 : 0.08 + dr() * 0.08,
            dr
          );
        }
      }
      this.driftMats.push({ u: add(b, 0.6).u, amp: L === 2 ? 0.7 : 1.4 });
    }

    /* 8.2.1 the silence: faint cold mist INSIDE the void arc only — never stars, never pickable */
    this.mistU = null;
    if (fx.mistMotes > 0) {
      const b = new CloudBuilder();
      const mr = rngFor("silence-mist");
      const cold = new THREE.Color(TUNING.silence.color);
      for (let i = 0; i < fx.mistMotes; i++) {
        const t = SIL_A + (SIL_B - SIL_A) * (0.04 + mr() * 0.92);
        const a = spiralAngle(t) + (mr() - 0.5) * 0.04;
        const r = spiralRadius(t) + (mr() + mr() - 1) * 12;
        b.push(new THREE.Vector3(Math.cos(a) * r, (mr() + mr() - 1) * 6, Math.sin(a) * r), cold, 2.2 + mr() * 1.4, 0.06 + mr() * 0.06, mr);
      }
      const mist = add(b, 0.3);
      this.mistU = mist.u;
      this.driftMats.push({ u: mist.u, amp: 1.2 });
    }

    /* 7 ambient life */
    const palette = CHAPTERS.map((ch) => ({ p: this.planets.get(ch.id)?.center.clone() ?? new THREE.Vector3(), c: new THREE.Color(ch.visual.atmosphere) }));
    const layout = this.expLayout();
    const XP = EXP[this.tier];
    this.shooting =
      fx.shootingStars > 0
        ? new ShootingStars(this.world, mk, track, {
            slots: Math.max(fx.shootingStars, XP.shower ? 3 : 0),
            maxActive: fx.shootingStars,
            palette,
            every: TUNING.shootingEvery,
            life: TUNING.shootingLife,
            now: this.time,
            validate: (x, y, z) => voidClearance(layout, x, y, z) >= VOID_RULE.streakMargin,
          })
        : null;

    /* the expansion: satellites · extra worlds · giants · love planets · UFOs */
    this.shedLevel = 0;
    const starT = new Map<string, number>();
    EVENTS.forEach((ev) => starT.set(ev.id, timeT(ev.date)));
    this.exp = new Expansion({
      root: this.world,
      mk,
      track,
      tier: this.tier,
      reduced: this.reduced,
      layout,
      timeT,
      starPos: this.eventPos,
      starT,
      cb: {
        burst: (p, n) => {
          for (let i = 0; i < n; i++) this.emitTrail(p, 1.8);
        },
        pulseStar: (id) => {
          const i = this.starIndex.get(id);
          if (i !== undefined) {
            this.pulseAt[i] = this.time;
            this.pulseAmp[i] = 0.6;
          }
        },
        found: (id) => this.onDiscover?.(id),
        beam: (id) => this.onUfoBeam?.(id),
      },
    });
    this.exp.setFound(this.foundIds);
    this.exp.setFlags({ ufo: this.lifeFlags.ufo, discoveries: this.lifeFlags.discoveries });
    this.exp.setEnabled(this.expOn);
    if (this.satInput.length) this.exp.setSatellites(this.satInput);
    this.expFrame = { state: this.state, camera: this.camera, hovered: null, revealT: this.revealT, special: false };
    this.applyStreakMode();
    // anniversary meteor shower — once per session
    if (!GalaxyScene.showerDone && !this.reduced && XP.shower && this.shooting && localISO().slice(5) === RELATIONSHIP_START.slice(5)) {
      GalaxyScene.showerDone = true;
      this.shooting.shower(7, 12, this.time + 5);
    }
    this.fireflies = fx.fireflies > 0 ? new Fireflies(this.world, mk, track, fx.fireflies, rngFor("fireflies"), [PINK, CYAN, GOLD, VIOLET]) : null;
    this.ptrTrail = fx.pointerTrail > 0 ? new PointerTrail(this.world, mk, track, fx.pointerTrail) : null;

    /* 8.2.3 anniversary & birthdays — purely cosmetic, from today's date */
    this.celebrate = [];
    this.heartRate = 1;
    const md = today.slice(5);
    if (RELATIONSHIP_START.slice(5) === md && today > RELATIONSHIP_START) {
      this.heartRate = TUNING.specialDayHeartRate;
      const i0 = this.starIndex.get(`event-${RELATIONSHIP_START}`);
      if (i0 !== undefined) this.celebrate.push(i0);
    }
    EVENTS.forEach((ev, i) => {
      if (ev.date.slice(5) === md && ev.date < today && /birthday/i.test(`${ev.title} ${ev.description}`)) {
        this.celebrate.push(i);
        this.heartRate = TUNING.specialDayHeartRate;
      }
    });
    this.celebrateSet = new Set(this.celebrate);

    this.applyStarMetaColors();
    this.syncFxUniforms();
    this.ftCooldown = this.time + 4;
  }

  /** Static per-material toggles (tier + reduced motion). Called on build / reduced change. */
  private syncFxUniforms() {
    const fx = this.fxt();
    for (const { u, tw } of this.materials) {
      u.uTwinkle.value = this.reduced ? 0 : tw;
      u.uTw2.value = fx.twoFreqTwinkle ? 1 : 0;
      u.uBreathAmp.value = fx.breathing ? TUNING.breathAmp : 0;
      u.uBreathPeriod.value = TUNING.breathPeriod;
      u.uDesatColor.value.set(TUNING.silence.color);
    }
    for (const u of this.starRotMats) {
      u.uRotAmp.value = FX[this.tier].starSpin ? TUNING.rotAmp : 0; // seeded attitude stays under reduced motion
      u.uSpin.value = fx.starSpin ? TUNING.starSpin : 0;
    }
    for (const u of this.flareMats) u.uFlare.value = fx.flares ? 1 : 0;
    for (const u of this.proxMats) u.uProx.value = fx.proximity ? 1 : 0;
    for (const d of this.driftMats) d.u.uDrift.value = this.reduced ? 0 : d.amp;
    for (const u of this.shimmerMats) {
      u.uRotAmp.value = 1;
      u.uSpin.value = this.reduced ? 0 : TUNING.shimmerSpin;
    }
  }

  private applyStarMetaColors() {
    if (!this.fxHalo) return;
    const col = this.fxHalo.geometry.getAttribute("aColor") as THREE.BufferAttribute;
    const arr = col.array as Float32Array;
    EVENTS.forEach((ev, i) => {
      let r = this.haloColBase[i * 3];
      let g = this.haloColBase[i * 3 + 1];
      let b = this.haloColBase[i * 3 + 2];
      if (this.celebrateSet.has(i)) {
        r = GOLD.r;
        g = GOLD.g;
        b = GOLD.b;
      } else if (this.starMeta[ev.id]?.favorite) {
        r += (GOLD.r - r) * 0.35;
        g += (GOLD.g - g) * 0.35;
        b += (GOLD.b - b) * 0.35;
      }
      arr[i * 3] = r;
      arr[i * 3 + 1] = g;
      arr[i * 3 + 2] = b;
    });
    col.needsUpdate = true;
  }

  /* ---------------------------------------------------------- mood ----- */

  private setMoodFor(state: GalaxyState) {
    if (state === "silence") {
      this.mdT = TUNING.silence.desat;
      this.miT = TUNING.silence.dim;
      this.mtT = TUNING.silence.timeScale;
    } else {
      this.mdT = 0;
      this.miT = 1;
      this.mtT = 1;
    }
  }

  private static approach(cur: number, target: number, k: number) {
    const v = cur + (target - cur) * k;
    return Math.abs(target - v) < 0.002 ? target : v; // lands EXACTLY on neutral values
  }

  private updateMood(dt: number) {
    const k = this.reduced ? 1 : 1 - Math.exp(-dt / (TUNING.silence.tweenSec / 3));
    this.moodDesat = GalaxyScene.approach(this.moodDesat, this.mdT, k);
    this.moodDim = GalaxyScene.approach(this.moodDim, this.miT, k);
    this.moodTime = GalaxyScene.approach(this.moodTime, this.mtT, k);
  }

  /** Lub-dub, then rest. Rate rises on the anniversary and birthdays. */
  private heartBeat(t: number) {
    const period = TUNING.heartPeriod / this.heartRate;
    const p = t % period;
    const bump = (c: number, w: number) => Math.exp(-((p - c) * (p - c)) / (2 * w * w));
    return 0.085 * bump(0.18, 0.07) + 0.055 * bump(0.5, 0.08);
  }

  /* ---------------------------------------------------- frame guard ---- */

  private frameGuard(dtRaw: number) {
    if (dtRaw > 0.25) return; // tab switches / hitches are not a performance signal
    this.ftAvg += (dtRaw * 1000 - this.ftAvg) * 0.05;
    const limit = FX[this.tier].frameGuardMs;
    if (!limit || this.time < this.ftCooldown || document.hidden) {
      this.ftSlowFor = 0;
      return;
    }
    this.ftSlowFor = this.ftAvg > limit ? this.ftSlowFor + dtRaw : 0;
    if (this.ftSlowFor > TUNING.frameGuardSeconds) {
      this.ftSlowFor = 0;
      this.ftCooldown = this.time + 8;
      if (this.expOn && this.shedLevel < 5) {
        // 1 giant glint · 2 fireflies · 3 world rims · 4 UFOs · 5 streak cadence — then global tier
        this.shedLevel++;
        this.exp?.setShed(this.shedLevel);
        if (this.shedLevel >= 5) this.applyStreakMode();
      } else this.opts.onAutoDowngrade?.(this.tier === "high" ? "medium" : "low");
    }
  }

  /* ------------------------------------------------------ per frame ---- */

  private updateFx(t: number) {
    this.updateStars(t);

    if (this.satellites) {
      const pA = this.satellites.geometry.getAttribute("position") as THREE.BufferAttribute;
      const aA = this.satellites.geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
      const pArr = pA.array as Float32Array;
      const aArr = aA.array as Float32Array;
      const ts = this.reduced ? 0 : t;
      for (let i = 0; i < EVENTS.length; i++) {
        const id = EVENTS[i].id;
        const media = this.starMeta[id]?.media ?? 0;
        const p = this.eventPos.get(id);
        const d = this.satData[i];
        if (!media || !this.revealed[i] || !p || !d) {
          aArr[i] = 0;
          continue;
        }
        const ang = d.phase + ts * d.speed;
        pArr[i * 3] = p.x + Math.cos(ang) * d.r;
        pArr[i * 3 + 1] = p.y + Math.sin(ang) * d.r * Math.sin(d.tilt);
        pArr[i * 3 + 2] = p.z + Math.sin(ang) * d.r * Math.cos(d.tilt);
        aArr[i] = 0.85;
      }
      pA.needsUpdate = true;
      aA.needsUpdate = true;
    }

    if (this.celebrate.length && !this.reduced && t >= this.celebrateNext) {
      this.celebrateNext = t + TUNING.celebrateEvery;
      for (const i of this.celebrate) {
        const p = this.eventPos.get(EVENTS[i].id);
        if (p) for (let k = 0; k < 14; k++) this.emitTrail(p, 2.2);
      }
    }

    // the mist gathers slightly as the silence deepens (compensating the global dim)
    if (this.mistU) this.mistU.uOpacity.value = (0.8 + 1.4 * (this.moodDesat / TUNING.silence.desat)) / Math.max(0.2, this.moodDim);

    const calm = this.reduced || this.state === "silence";
    this.shooting?.update(t, !calm && (!this.expOn || this.lifeFlags.falling));
    this.fireflies?.update(t, this.camera.position, !this.reduced && this.shedLevel < 2);
    if (this.exp) {
      const f = this.expFrame;
      f.state = this.state;
      f.hovered = this.hoveredId;
      f.revealT = this.revealT;
      f.special = this.heartRate > 1;
      this.exp.update(t, f);
    }

    if (this.ptrTrail) {
      if (!this.reduced && this.pointerMoved && this.pointerNDC.x >= -1) {
        this.raycaster.setFromCamera(this.pointerNDC, this.camera);
        this.trailPlane.constant = -this.lookAt.y;
        if (this.raycaster.ray.intersectPlane(this.trailPlane, this.tmpV)) this.ptrTrail.emit(this.tmpV, t);
      }
      this.pointerMoved = false;
      this.ptrTrail.update(t);
    }
  }

  /** Core + halo animation for the 52 memory stars: reveal pop, pulses, hover, favourites, upcoming. */
  private updateStars(t: number) {
    if (!this.starPoints || !this.revealed.length) return;
    const sA = this.starPoints.geometry.getAttribute("aSize") as THREE.BufferAttribute;
    const aA = this.starPoints.geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
    const sArr = sA.array as Float32Array;
    const aArr = aA.array as Float32Array;
    const hS = this.fxHalo ? (this.fxHalo.geometry.getAttribute("aSize") as THREE.BufferAttribute) : null;
    const hA = this.fxHalo ? (this.fxHalo.geometry.getAttribute("aAlpha") as THREE.BufferAttribute) : null;
    const hsArr = hS ? (hS.array as Float32Array) : null;
    const haArr = hA ? (hA.array as Float32Array) : null;
    const hoverIdx = this.hoveredId ? this.starIndex.get(this.hoveredId) ?? -1 : -1;
    const hoverCh = hoverIdx >= 0 ? this.starChapter[hoverIdx] : -1;
    const glow = this.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.4);
    for (let i = 0; i < this.revealed.length; i++) {
      const on = this.revealed[i] === 1;
      let s = this.starBase[i];
      let a = on ? (this.upcoming[i] ? 0.35 : 0.95) : 0;
      const pa = t - this.popAt[i];
      const popping = pa >= 0 && pa < 0.42;
      if (popping) {
        const k = pa / 0.42;
        s *= k < 0.6 ? 0.05 + (k / 0.6) * 1.2 : 1.25 - 0.25 * ((k - 0.6) / 0.4);
        a *= Math.min(1, k * 2.4);
      }
      const pp = t - this.pulseAt[i];
      const pulse = pp >= 0 && pp < 0.6 ? 1 + this.pulseAmp[i] * Math.sin((pp / 0.6) * Math.PI) : 1;
      s *= pulse;
      let dim = 1;
      if (i === hoverIdx) s *= 1.2;
      else if (hoverCh >= 0 && this.starChapter[i] === hoverCh) dim = 0.6;
      sArr[i] = on ? s : 0.0001;
      aArr[i] = a * dim;
      if (hsArr && haArr) {
        const fav = !!this.starMeta[EVENTS[i].id]?.favorite;
        let hs = this.haloBase[i] * (fav ? TUNING.haloFavouriteScale : 1) * (i === hoverIdx ? 1.6 : 1) * pulse;
        let ha = TUNING.haloAlpha * (this.upcoming[i] ? 0.55 : 1) * dim * (fav ? 1.25 : 1);
        if (this.celebrateSet.has(i)) {
          hs *= 1.15 + 0.25 * glow;
          ha *= 1.6 + 0.8 * glow;
        }
        if (popping) hs *= Math.min(1, pa / 0.3);
        hsArr[i] = on ? hs : 0.0001;
        haArr[i] = on ? ha : 0;
      }
    }
    sA.needsUpdate = true;
    aA.needsUpdate = true;
    if (hS && hA) {
      hS.needsUpdate = true;
      hA.needsUpdate = true;
    }
  }

  /* ------------------------------------------------- story moments ----- */

  /** 9.1.4 ripple from the picked star, then a pulse along its chapter's strand. */
  private pickRipple(id: string) {
    if (this.reduced) return;
    const i = this.starIndex.get(id);
    const p = this.eventPos.get(id);
    if (i === undefined || !p) return;
    const w = this.waves.find((x) => x.t < 0);
    if (w) {
      w.t = 0;
      w.max = 9;
      w.pts.visible = true;
      w.pts.position.copy(p);
    }
    this.pulseAt[i] = this.time;
    this.pulseAmp[i] = 0.5;
    if (FX[this.tier].pickRipple !== "full") return;
    const ch = EVENTS[i].chapterId;
    const same: number[] = [];
    EVENTS.forEach((ev, j) => ev.chapterId === ch && same.push(j));
    const pos = same.indexOf(i);
    same.forEach((j, k) => {
      const steps = Math.abs(k - pos);
      if (!steps) return;
      this.pulseAt[j] = this.time + 0.18 + steps * 0.06;
      this.pulseAmp[j] = 0.35;
    });
  }

  /** 9.2.2 the release: colour returns, and a warm wave flares star by star across the spiral. */
  private reunionRelease(s: THREE.Vector3) {
    this.mdT = 0;
    this.miT = 1;
    this.mtT = 1;
    if (this.reduced || FX[this.tier].reunionWave !== "full") return; // simple: the mood tween is the fade
    let maxD = 1;
    for (const p of this.eventPos.values()) maxD = Math.max(maxD, p.distanceTo(s));
    EVENTS.forEach((ev, i) => {
      const p = this.eventPos.get(ev.id);
      if (!p) return;
      this.pulseAt[i] = this.time + (p.distanceTo(s) / maxD) * TUNING.reunionWaveSec;
      this.pulseAmp[i] = 0.55;
    });
  }

  /* ---------------------------------------------------- camera life ---- */

  /** 7.5 idle drift + 7.6 pointer / gyro parallax, applied on top of the damped rig. */
  private applyCameraLife(dt: number) {
    const fx = this.fxt();
    const orbiting = this.state === "observatory" || this.state === "present";
    const idle = fx.idleDrift && orbiting && performance.now() - this.lastInput > TUNING.idleAfterMs;
    this.idleBlend += ((idle ? 1 : 0) - this.idleBlend) * (1 - Math.exp(-dt * (idle ? 0.35 : 3.75)));
    if (this.idleBlend > 0.0005) this.idlePhase += (dt * Math.PI * 2) / TUNING.idlePeriod;
    const yaw = Math.sin(this.idlePhase) * THREE.MathUtils.degToRad(TUNING.idleYawDeg) * this.idleBlend;
    const roll = Math.sin(this.idlePhase * 0.7 + 1.3) * THREE.MathUtils.degToRad(TUNING.idleRollDeg) * this.idleBlend;

    let px = 0;
    let py = 0;
    if (fx.parallax) {
      if (this.pointerNDC.x >= -1) {
        px = this.pointerNDC.x;
        py = this.pointerNDC.y;
      } else if (this.hasGyro) {
        px = this.gyroX;
        py = this.gyroY;
      }
    }
    const kp = 1 - Math.exp(-dt * 2);
    this.parX += (px - this.parX) * kp;
    this.parY += (py - this.parY) * kp;

    const off = this.tmpV2.copy(this.camPos).sub(this.lookAt);
    const dist = off.length();
    if (yaw !== 0) off.applyAxisAngle(UP_AXIS, yaw);
    const pos = this.tmpV3.copy(this.lookAt).add(off);
    if (Math.abs(this.parX) > 1e-5 || Math.abs(this.parY) > 1e-5) {
      this.camRight.setFromMatrixColumn(this.camera.matrixWorld, 0);
      this.camUp.setFromMatrixColumn(this.camera.matrixWorld, 1);
      pos.addScaledVector(this.camRight, this.parX * dist * TUNING.parallax).addScaledVector(this.camUp, this.parY * dist * TUNING.parallax * 0.6);
    }
    this.camera.position.copy(pos);
    this.camera.up.set(0, 1, 0);
    if (roll !== 0) {
      this.fwd.copy(this.lookAt).sub(pos).normalize();
      this.camera.up.applyAxisAngle(this.fwd, roll);
    }
    this.camera.lookAt(this.lookAt);
  }

  private onGyro = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return;
    this.hasGyro = true;
    this.gyroX = THREE.MathUtils.clamp(e.gamma / 30, -1, 1);
    this.gyroY = THREE.MathUtils.clamp((e.beta - 45) / 30, -1, 1);
  };

  /** Feature-detected, after a touch gesture, asked at most once. */
  private initGyro() {
    if (this.gyroAsked || !FX[this.tier].parallax || !("DeviceOrientationEvent" in window)) return;
    this.gyroAsked = true;
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    const attach = () => window.addEventListener("deviceorientation", this.onGyro);
    if (typeof DOE.requestPermission === "function") {
      DOE.requestPermission()
        .then((r) => {
          if (r === "granted") attach();
        })
        .catch(() => undefined);
    } else attach();
  }

  /* --------------------------------------------- additive public API --- */

  /** Favourites & media counts from the memory store (visual only). */
  setStarMeta(meta: Record<string, StarMeta>) {
    this.starMeta = meta;
    this.applyStarMetaColors();
  }

  /** Top-down layout for the minimap — the same positions as the 3D scene. */
  getLayout(): GalaxyLayout {
    const colorOf = (id: ChapterId) => CHAPTERS.find((c) => c.id === id)?.visual.atmosphere ?? "#ffffff";
    const stars = EVENTS.map((ev) => {
      const p = this.eventPos.get(ev.id);
      return { id: ev.id, chapterId: ev.chapterId, x: p?.x ?? 0, z: p?.z ?? 0, color: colorOf(ev.chapterId) };
    });
    const planets = CHAPTERS.map((ch) => {
      const p = this.planets.get(ch.id);
      return { id: ch.id, index: ch.index, title: ch.title, x: p?.center.x ?? 0, z: p?.center.z ?? 0, color: ch.visual.atmosphere };
    });
    const voidArc: [number, number][] = [];
    for (let k = 0; k <= 40; k++) {
      const t = SIL_A + ((SIL_B - SIL_A) * k) / 40;
      const a = spiralAngle(t);
      const r = spiralRadius(t);
      voidArc.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    let extent = R_OUT + 12;
    for (const p of planets) extent = Math.max(extent, Math.hypot(p.x, p.z) + 6);
    return { extent, stars, planets, voidArc };
  }

  /* ------------------------------------------ expansion public API ---- */

  /** One satellite per memory (canonical + user-added), around its chapter world. */
  setEventSatellites(events: SatInput[]) {
    this.satInput = events.slice();
    this.exp?.setSatellites(this.satInput);
  }

  /** Discoveries already found (persisted by the React side). */
  setDiscoveries(found: string[]) {
    this.foundIds = found.slice();
    this.exp?.setFound(this.foundIds);
  }

  /** Fly the camera to a discovery; holds until the next state change. */
  flyToDiscovery(id: string) {
    const f = this.exp?.focusFor(id);
    if (!f) return;
    if (this.state !== "observatory" && this.state !== "present") {
      this.state = "observatory";
      this.opts.onStateChange?.("observatory");
    }
    this.discoveryFocus = f;
    this.lastInput = performance.now();
    this.applyState(this.state, {});
  }

  /** Master switch for every expansion element (default on). Off = the pre-expansion scene. */
  setExpansionEnabled(on: boolean) {
    this.expOn = on;
    this.exp?.setEnabled(on);
    this.applyStreakMode();
  }

  /** Per-feature toggles from the "Galaxy life" settings. */
  setGalaxyLife(f: Partial<{ ufo: boolean; fallingStars: boolean; discoveries: boolean }>) {
    if (f.ufo !== undefined) this.lifeFlags.ufo = f.ufo;
    if (f.fallingStars !== undefined) this.lifeFlags.falling = f.fallingStars;
    if (f.discoveries !== undefined) this.lifeFlags.discoveries = f.discoveries;
    this.exp?.setFlags({ ufo: this.lifeFlags.ufo, discoveries: this.lifeFlags.discoveries });
    this.applyStreakMode();
  }

  /** Try to catch a golden falling star under the pointer. Returns true on a catch. */
  catchStar(): boolean {
    if (!this.shooting || !this.expOn || this.pointerNDC.x < -1) return false;
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    if (!this.shooting.catchAt(this.pointerNDC, this.camera, w, h, 44, this.tmpV3)) return false;
    const at = this.tmpV3.clone();
    if (!this.reduced) for (let i = 0; i < 30; i++) this.emitTrail(at, 2.4);
    this.exp?.markFound("exp:wish:first", true);
    this.onWishCaught?.();
    return true;
  }

  /** Keyboard stepping through a chapter's satellites (null clears). */
  highlightSatellite(id: string | null) {
    this.exp?.highlight(id);
    if (id) {
      const i = this.starIndex.get(id);
      if (i !== undefined) {
        this.pulseAt[i] = this.time;
        this.pulseAmp[i] = 0.4;
      }
    }
  }

  getDiscoverables(): Discoverable[] {
    return this.exp?.discoverables() ?? [];
  }

  /** Plans, satellite phase table, parity and checker output — diff two loads to verify determinism. */
  getExpansionDebug() {
    return this.exp?.debug() ?? null;
  }

  private applyStreakMode() {
    const s = this.shooting;
    if (!s) return;
    const X = EXP[this.tier];
    if (this.expOn && X.streakEvery) {
      const slow = this.shedLevel >= 5 ? 2 : 1;
      s.setCadence([X.streakEvery[0] * slow, X.streakEvery[1] * slow], X.streakLife, this.time);
      s.setGoldChance(this.lifeFlags.falling ? X.goldChance : 0);
    } else {
      s.setCadence(TUNING.shootingEvery, TUNING.shootingLife, this.time);
      s.setGoldChance(0);
    }
  }

  /** Layout facts the expansion planner needs (same spiral as this scene). */
  private expLayout(): ExpLayout {
    const planets = CHAPTERS.map((ch) => {
      const p = this.planets.get(ch.id);
      return { id: ch.id, center: p ? p.center.clone() : new THREE.Vector3(), radius: p ? p.radius : 3, moonRadii: p ? p.moonData.map((m) => m.r) : [] };
    });
    const voidArc: { x: number; z: number }[] = [];
    for (let k = 0; k <= 80; k++) {
      const t = SIL_A + ((SIL_B - SIL_A) * k) / 80;
      const a = spiralAngle(t);
      const r = spiralRadius(t);
      voidArc.push({ x: Math.cos(a) * r, z: Math.sin(a) * r });
    }
    const aP = spiralAngle(1);
    const rP = spiralRadius(1) + laneOffset(N_CHAPTERS - 1);
    return {
      planets,
      voidArc,
      hole: this.holeCenter.clone(),
      spiralOuter: R_OUT + LANE_W * 3,
      presentAnchor: new THREE.Vector3(Math.cos(aP) * rP, 2.2, Math.sin(aP) * rP),
      camOrbit: { radius: 118, y: 52 },
    };
  }

  /** Where the camera is looking (top-down x/z), for the minimap marker. */
  getFocus(): { x: number; z: number } {
    return { x: this.lookAt.x, z: this.lookAt.z };
  }

  /* -------------------------------------------------------------- dispose -- */

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
    window.removeEventListener("deviceorientation", this.onGyro);
    this.clearWorld();
    for (const d of this.baseDisposables) d.dispose();
    this.baseDisposables = [];
    if (this.labelLayer) this.labelLayer.innerHTML = "";
    this.renderer.dispose();
  }
}
