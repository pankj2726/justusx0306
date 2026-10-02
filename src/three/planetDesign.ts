/* =========================================================================
   src/three/planetDesign.ts
   Deterministic planet design system + the canonical galaxy layout.

   SEED: OUR-GALAXY-0306 — every important celestial object is a pure
   function of (seed, event id / chapter id). Reloading never moves a memory.

   LAYOUT RULE: the galaxy is a TIME SPIRAL. Angular position is a function
   of the event's real date, so the 588-day separation is not illustrated —
   it is structurally an empty arc of sky. No star is ever generated to fill
   it.
   ========================================================================= */

import {
  CHAPTERS,
  EVENTS,
  SILENCE_END,
  SILENCE_START,
  parseISO,
  type Chapter,
  type ChapterId,
  type GalaxyEvent,
} from "@/data/canonicalTimeline";
import { seedFrom } from "./textures";

export const GALAXY_SEED = "OUR-GALAXY-0306";

export function rngFor(key: string): () => number {
  let a = seedFrom(GALAXY_SEED + "::" + key) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------ types ---- */

export type RingConfig = {
  inner: number;
  outer: number;
  color: string;
  opacity: number;
  tilt: number;
};

export type MoonConfig = {
  distance: number;
  radius: number;
  speed: number;
  phase: number;
  color: string;
};

export type OrbitConfig = {
  radius: number;
  speed: number;
  phase: number;
  tilt: number;
  eccentricity: number;
};

export type PlanetVisualConfig = {
  id: string;
  radius: number;
  baseColor: string;
  accentColor: string;
  atmosphereColor: string;
  atmosphereStrength: number;
  ring?: RingConfig;
  moons: MoonConfig[];
  orbit: OrbitConfig;
  glow: number;
  spin: number;
  /** "lovely atoms": micro particle companion count */
  atoms: number;
};

/* -------------------------------------------------- the time spiral ----- */

const TURNS = 2.65;
const R0 = 17;
const R1 = 70;

const FIRST = parseISO(EVENTS[0].date);
const LAST = parseISO(EVENTS[EVENTS.length - 1].date);
const SPAN = Math.max(LAST - FIRST, 1);

export function timeT(iso: string): number {
  return Math.min(1, Math.max(0, (parseISO(iso) - FIRST) / SPAN));
}

export function spiralPoint(t: number, radialJit = 0, angleJit = 0, yJit = 0): [number, number, number] {
  const theta = -Math.PI * 0.35 + t * Math.PI * 2 * TURNS;
  const r = R0 + t * (R1 - R0) + radialJit;
  const a = theta + angleJit;
  const y =
    Math.sin(t * Math.PI * 3.1) * 3.4 +
    Math.cos(t * Math.PI * 7.3) * 1.2 +
    yJit;
  return [Math.cos(a) * r, y, Math.sin(a) * r];
}

/* -------------------------------------------- chapter planet configs ---- */

const CHAPTER_RADIUS: Record<ChapterId, number> = {
  "ch-01": 2.7,
  "ch-02": 2.3,
  "ch-03": 3.1,
  "ch-04": 1.9,
  "ch-05": 2.6,
  "ch-06": 2.35,
  "ch-07": 2.9,
};

export function chapterT(ch: Chapter): number {
  const evs = EVENTS.filter((e) => e.chapterId === ch.id);
  if (evs.length) return timeT(evs[0].date);
  // "The Quiet" has no events by design — seat it mid-separation.
  return (timeT(SILENCE_START) + timeT(SILENCE_END)) / 2;
}

export function chapterPlanetConfig(ch: Chapter): PlanetVisualConfig {
  const rnd = rngFor(`chapter:${ch.id}`);
  const radius = CHAPTER_RADIUS[ch.id] ?? 2.4;
  const ring: RingConfig | undefined = ch.visual.ring
    ? {
        inner: 1.36,
        outer: 2.45 + rnd() * 0.5,
        color: ch.visual.ring,
        opacity: 0.42 + rnd() * 0.3,
        tilt: 0.42 + rnd() * 0.5,
      }
    : undefined;

  const moons: MoonConfig[] = Array.from({ length: ch.visual.moons }).map((_, i) => ({
    distance: radius * (1.75 + i * 0.62 + rnd() * 0.3),
    radius: radius * (0.055 + rnd() * 0.07),
    speed: 0.24 + rnd() * 0.36,
    phase: rnd() * Math.PI * 2,
    color: i % 2 === 0 ? "#cdc5b7" : ch.visual.atmosphere,
  }));

  return {
    id: ch.id,
    radius,
    baseColor: ch.visual.base,
    accentColor: ch.visual.nebula,
    atmosphereColor: ch.visual.atmosphere,
    atmosphereStrength: 0.55 + ch.visual.glow * 0.75,
    ring,
    moons,
    orbit: {
      radius: 0, // chapter planets are fixed landmarks, not orbiters
      speed: 0.018 + rnd() * 0.02,
      phase: rnd() * Math.PI * 2,
      tilt: 0.1 + rnd() * 0.35,
      eccentricity: 0.06 + rnd() * 0.1,
    },
    glow: ch.visual.glow,
    spin: 0.035 + rnd() * 0.05,
    atoms: EVENTS.some((e) => e.chapterId === ch.id) ? 14 + Math.round(rnd() * 14) : 0,
  };
}

/* ---------------------------------------------- memory star positions --- */

export type MemoryNode = {
  galaxyObjectId: string;
  eventId: string;
  chapterId: ChapterId;
  position: [number, number, number];
  t: number;
  /** structural flags derived from data only — never a subjective score */
  opensChapter: boolean;
  closesChapter: boolean;
  isReunion: boolean;
  isSilenceOpening: boolean;
  size: number;
  color: string;
};

function chapterColor(id: ChapterId): string {
  return CHAPTERS.find((c) => c.id === id)?.visual.atmosphere ?? "#7fe9ff";
}

export function buildMemoryNodes(): MemoryNode[] {
  return EVENTS.map((ev, idx) => {
    const rnd = rngFor(`star:${ev.id}`);
    const t = timeT(ev.date);
    const prev = EVENTS[idx - 1];
    const next = EVENTS[idx + 1];
    const opensChapter = !prev || prev.chapterId !== ev.chapterId;
    const closesChapter = !next || next.chapterId !== ev.chapterId;
    const isReunion = ev.date === SILENCE_END;
    const isSilenceOpening = ev.date === SILENCE_START;

    const radial = (rnd() - 0.5) * 7.5;
    const angle = (rnd() - 0.5) * 0.055;
    const yj = (rnd() - 0.5) * 5.2;

    return {
      galaxyObjectId: ev.galaxyObjectId,
      eventId: ev.id,
      chapterId: ev.chapterId,
      position: spiralPoint(t, radial, angle, yj),
      t,
      opensChapter,
      closesChapter,
      isReunion,
      isSilenceOpening,
      // size driven by structure (does it open/close a chapter?) not by taste
      size: (opensChapter || closesChapter ? 3.1 : 2.15) + rnd() * 0.7,
      color: isReunion || isSilenceOpening ? "#ffb74b" : chapterColor(ev.chapterId),
    };
  });
}

export function buildChapterNodes(): { chapter: Chapter; position: [number, number, number]; t: number }[] {
  return CHAPTERS.map((ch) => {
    const t = chapterT(ch);
    const rnd = rngFor(`chpos:${ch.id}`);
    const p = spiralPoint(t, 0, 0.06 + rnd() * 0.03, -1.4 + rnd() * 2.4);
    return { chapter: ch, position: p, t };
  });
}

/** Centroid of the separation arc — the camera's "silence" destination. */
export function silenceAnchor(): [number, number, number] {
  const a = timeT(SILENCE_START);
  const b = timeT(SILENCE_END);
  return spiralPoint((a + b) / 2, 16, 0, 6);
}

export function nodeForEvent(id: string): MemoryNode | undefined {
  return buildMemoryNodes().find((n) => n.eventId === id);
}

/* -------------------------------------------------- galaxy ↔ event map --- */

export type GalaxyLink = {
  galaxyObjectId: string;
  targetType: "event" | "chapter";
  targetId: string;
};

export function buildLinks(): GalaxyLink[] {
  const evLinks: GalaxyLink[] = EVENTS.map((e) => ({
    galaxyObjectId: e.galaxyObjectId,
    targetType: "event" as const,
    targetId: e.id,
  }));
  const chLinks: GalaxyLink[] = CHAPTERS.map((c) => ({
    galaxyObjectId: `chapter-planet-${c.id}`,
    targetType: "chapter" as const,
    targetId: c.id,
  }));
  return [...evLinks, ...chLinks];
}

/** Resolve a picked object back to a real id — never an array index. */
export function resolveLink(galaxyObjectId: string): GalaxyLink | undefined {
  return buildLinks().find((l) => l.galaxyObjectId === galaxyObjectId);
}

export function eventGalaxyId(event: GalaxyEvent): string {
  return event.galaxyObjectId;
}
