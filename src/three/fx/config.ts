/* =========================================================================
   src/three/fx/config.ts — every tunable of the galaxy upgrade, per tier.

   One place to tune or disable any effect. GalaxyScene reads FX[tier] when it
   builds, and effectiveFx(tier, reduced) every frame (cached objects, no
   per-frame allocation). Base galaxy counts from galaxyScene v3 are unchanged.

   Sparkles ADDED by the upgrade (approximate):
                          low     medium     high
     star halos             0         52        52
     satellites             0      ≤ 52      ≤ 52     (only memories with media)
     planet rim             0      ~655     ~1820     (260·M·rim per world × 7)
     dust layer 2           0      ~606     ~1010
     dust layer 3           0         0      ~905
     silence mist          24        40        60     (inside the void arc only)
     core shimmer           0         5         5
     fireflies              0         6        14
     shooting stars         0        16        32     (16 per streak slot)
     pointer trail          0         0        24
   ========================================================================= */

export type Tier = "high" | "medium" | "low";

export type FxTier = {
  halos: boolean;
  starSpin: boolean;
  satellites: boolean;
  /** 0 = off, otherwise density multiplier of the planet atmosphere rim */
  planetRim: number;
  dustLayers: 1 | 2 | 3;
  breathing: boolean;
  twoFreqTwinkle: boolean;
  flares: boolean;
  shootingStars: number;
  fireflies: number;
  idleDrift: boolean;
  parallax: boolean;
  proximity: boolean;
  pointerTrail: number;
  pickRipple: "simple" | "full";
  scrubPop: boolean;
  reunionWave: "simple" | "full";
  coreShimmer: boolean;
  mistMotes: number;
  labelEase: boolean;
  /** rolling frame time (ms) above which the scene asks to drop a tier; 0 = never */
  frameGuardMs: number;
};

export const FX: Record<Tier, FxTier> = {
  low: {
    halos: false,
    starSpin: false,
    satellites: false,
    planetRim: 0,
    dustLayers: 1,
    breathing: false,
    twoFreqTwinkle: false,
    flares: false,
    shootingStars: 0,
    fireflies: 0,
    idleDrift: false,
    parallax: false,
    proximity: false,
    pointerTrail: 0,
    pickRipple: "simple",
    scrubPop: true,
    reunionWave: "simple",
    coreShimmer: false,
    mistMotes: 24,
    labelEase: true,
    frameGuardMs: 0,
  },
  medium: {
    halos: true,
    starSpin: true,
    satellites: true,
    planetRim: 0.6,
    dustLayers: 2,
    breathing: true,
    twoFreqTwinkle: true,
    flares: true,
    shootingStars: 1,
    fireflies: 6,
    idleDrift: true,
    parallax: true,
    proximity: true,
    pointerTrail: 0,
    pickRipple: "full",
    scrubPop: true,
    reunionWave: "full",
    coreShimmer: true,
    mistMotes: 40,
    labelEase: true,
    frameGuardMs: 24,
  },
  high: {
    halos: true,
    starSpin: true,
    satellites: true,
    planetRim: 1,
    dustLayers: 3,
    breathing: true,
    twoFreqTwinkle: true,
    flares: true,
    shootingStars: 2,
    fireflies: 14,
    idleDrift: true,
    parallax: true,
    proximity: true,
    pointerTrail: 24,
    pickRipple: "full",
    scrubPop: true,
    reunionWave: "full",
    coreShimmer: true,
    mistMotes: 60,
    labelEase: true,
    frameGuardMs: 24,
  },
};

/** Reduced motion: every ambient/motion effect off or static; structure stays. */
function reduce(f: FxTier): FxTier {
  return {
    ...f,
    starSpin: false,
    breathing: false,
    twoFreqTwinkle: false,
    flares: false,
    shootingStars: 0,
    fireflies: 0,
    idleDrift: false,
    parallax: false,
    proximity: false,
    pointerTrail: 0,
    scrubPop: false,
    labelEase: false,
  };
}
const REDUCED: Record<Tier, FxTier> = { low: reduce(FX.low), medium: reduce(FX.medium), high: reduce(FX.high) };

export function effectiveFx(tier: Tier, reduced: boolean): FxTier {
  return reduced ? REDUCED[tier] : FX[tier];
}

export const TUNING = {
  /* stars */
  haloSize: 15,
  haloAlpha: 0.16,
  haloFavouriteScale: 1.2,
  starSizeJitter: 0.12,
  satelliteSize: 1.1,
  rotAmp: 0.35,
  starSpin: 0.05,
  shimmerSpin: 0.04,
  /* breathing */
  breathAmp: 0.06,
  breathPeriod: 14,
  /* dust */
  dustLayer2PerChapter: 70,
  dustLayer3PerChapter: 55,
  dustPerEvent: 10,
  /* ambient */
  shootingEvery: [20, 40] as const,
  shootingLife: [0.9, 1.3] as const,
  idleAfterMs: 6000,
  idleYawDeg: 1.5,
  idleRollDeg: 0.8,
  idlePeriod: 40,
  parallax: 0.012,
  proximityPx: 90,
  /* story */
  silence: { desat: 0.85, dim: 0.55, timeScale: 0.5, tweenSec: 1.2, color: "#8aa0c0" },
  reunionWaveSec: 2.6,
  heartPeriod: 4,
  specialDayHeartRate: 1.3,
  celebrateEvery: 8,
  /* labels */
  labelLerp: 0.22,
  labelOverlapEvery: 3,
  /* performance */
  frameGuardSeconds: 3,
};

/* =========================================================================
   EXPANSION — satellites, extra worlds, giants, love planets, UFOs,
   falling stars. Every count/cadence of the expansion lives here.

   Planned new points (combined, approximate; hard caps enforced by a dev check):
                          low        medium       high
     satellites (≤160)    ~0.2k      ~3k          ~3k   (core+halo+speck+guides)
     extra worlds         4 × ~140   8 × ~290     13 × ~480
     giant ringed         1 × 900    2 × 2.2k     3 × 4.3k
     twin / heart ring    ~0.6k      ~1k          ~1.2k
     heart belt           —          ~0.8k        ~1.4k
     UFOs + beam          —          ~0.3k        ~0.5k
     TOTAL                ≈ 2.3k     ≈ 12k        ≈ 25k    (caps 6k / 22k / 45k)
   ========================================================================= */

/** The void: a slab around the silence arc of the time spiral + the black hole. */
export const VOID_RULE = {
  /** horizontal half-width of the silence band around its spiral centreline */
  halfWidth: 11,
  /** vertical half-thickness of the void slab (strands ±2.8, mist ±6) */
  slab: 8,
  /** exclusion buffer multiplier (+12%) */
  buffer: 1.12,
  /** black hole + accretion disc radius */
  holeRadius: 26,
  /** extra clearance for streaks / UFO paths */
  streakMargin: 4,
  ufoMargin: 6,
};

export type ExpTier = {
  satHalos: boolean;
  satGuides: boolean;
  satTrails: boolean;
  satPop: boolean;
  satCapacity: number;
  extras: number;
  extraPts: number;
  rims: boolean;
  bands: boolean;
  vortex: boolean;
  giants: number;
  giantPts: number;
  giantGlint: boolean;
  twinPts: number;
  twinBridge: boolean;
  twinSync: boolean;
  heartRingPts: number;
  heartBelt: boolean;
  beltPts: number;
  beltBrighten: boolean;
  ufos: number;
  /** null = falling stars off at this tier */
  streakEvery: readonly [number, number] | null;
  streakLife: readonly [number, number];
  goldChance: number;
  shower: boolean;
  burst: "simple" | "full";
  pointCap: number;
};

export const EXP: Record<Tier, ExpTier> = {
  low: {
    satHalos: false,
    satGuides: false,
    satTrails: false,
    satPop: true,
    satCapacity: 160,
    extras: 4,
    extraPts: 90,
    rims: false,
    bands: false,
    vortex: false,
    giants: 1,
    giantPts: 900,
    giantGlint: false,
    twinPts: 110,
    twinBridge: false,
    twinSync: false,
    heartRingPts: 140,
    heartBelt: false,
    beltPts: 0,
    beltBrighten: false,
    ufos: 0,
    streakEvery: null,
    streakLife: [0.6, 1.6],
    goldChance: 0,
    shower: false,
    burst: "simple",
    pointCap: 6000,
  },
  medium: {
    satHalos: true,
    satGuides: true,
    satTrails: false,
    satPop: true,
    satCapacity: 160,
    extras: 8,
    extraPts: 180,
    rims: true,
    bands: false,
    vortex: false,
    giants: 2,
    giantPts: 2200,
    giantGlint: false,
    twinPts: 180,
    twinBridge: true,
    twinSync: false,
    heartRingPts: 200,
    heartBelt: true,
    beltPts: 800,
    beltBrighten: false,
    ufos: 1,
    streakEvery: [10, 22],
    streakLife: [0.6, 1.6],
    goldChance: 1 / 9,
    shower: true,
    burst: "full",
    pointCap: 22000,
  },
  high: {
    satHalos: true,
    satGuides: true,
    satTrails: true,
    satPop: true,
    satCapacity: 160,
    extras: 13,
    extraPts: 300,
    rims: true,
    bands: true,
    vortex: true,
    giants: 3,
    giantPts: 4200,
    giantGlint: true,
    twinPts: 240,
    twinBridge: true,
    twinSync: true,
    heartRingPts: 260,
    heartBelt: true,
    beltPts: 1400,
    beltBrighten: true,
    ufos: 2,
    streakEvery: [6, 14],
    streakLife: [0.6, 1.6],
    goldChance: 1 / 6,
    shower: true,
    burst: "full",
    pointCap: 45000,
  },
};
