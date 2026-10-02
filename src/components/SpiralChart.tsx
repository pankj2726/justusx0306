import type { CSSProperties } from "react";
import { CHAPTER_BY_ID, SILENCE_DAYS, SILENCE_END, SILENCE_START, parseISO } from "../data/canonicalTimeline";
import { useReveal } from "../hooks/useReveal";

type Ev = { id: string; date: string; chapterId: string; title: string };

const SIZE = 520;
const C = 260;
const R0 = 46;
const R1 = 226;
const TURNS = 2.15;

/** Moments on a time spiral that mirrors the galaxy; the silence is an empty dashed arc. */
export default function SpiralChart({ events }: { events: Ev[] }) {
  const ref = useReveal<HTMLDivElement>(0.25);
  if (!events.length) return null;

  const sorted = [...events].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const t0 = parseISO(sorted[0].date);
  const t1 = Math.max(parseISO(sorted[sorted.length - 1].date), t0 + 1);
  const pt = (ms: number): [number, number] => {
    const t = Math.min(1, Math.max(0, (ms - t0) / (t1 - t0)));
    const a = -Math.PI / 2 + t * TURNS * Math.PI * 2;
    const r = R0 + (R1 - R0) * t;
    return [C + Math.cos(a) * r, C + Math.sin(a) * r];
  };
  const path = (a: number, b: number) => {
    const steps = Math.max(8, Math.round(((b - a) / (t1 - t0)) * 420));
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const [x, y] = pt(a + ((b - a) * i) / steps);
      d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  };

  const sA = Math.max(t0, parseISO(SILENCE_START));
  const sB = Math.min(t1, parseISO(SILENCE_END));
  const hasSilence = sB > sA;
  const years: { y: number; x: number; yy: number }[] = [];
  for (let y = new Date(t0).getUTCFullYear() + 1; y <= new Date(t1).getUTCFullYear(); y++) {
    const [x, yy] = pt(Date.UTC(y, 0, 1));
    years.push({ y, x, yy });
  }
  const mid = pt((sA + sB) / 2);
  const dx = mid[0] - C;
  const dy = mid[1] - C;
  const len = Math.hypot(dx, dy) || 1;
  const lab: [number, number] = [mid[0] + (dx / len) * 24, mid[1] + (dy / len) * 24];

  return (
    <div ref={ref}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Our ${events.length} moments along a time spiral. The ${SILENCE_DAYS}-day silence is an empty dashed arc.`}
      >
        <circle cx={C} cy={C} r={R1 + 18} fill="none" stroke="rgba(236,230,220,0.05)" />
        <path d={hasSilence ? path(t0, sA) : path(t0, t1)} pathLength={1} className="spiral-path" fill="none" stroke="rgba(236,230,220,0.3)" strokeWidth={1.2} />
        {hasSilence && (
          <path d={path(sB, t1)} pathLength={1} className="spiral-path" fill="none" stroke="rgba(236,230,220,0.3)" strokeWidth={1.2} style={{ transitionDelay: "1.4s" }} />
        )}
        {hasSilence && (
          <>
            <path d={path(sA, sB)} className="spiral-silence" fill="none" stroke="#8aa0c0" strokeOpacity={0.6} strokeWidth={1.2} strokeDasharray="2 6" strokeLinecap="round" />
            <text x={lab[0]} y={lab[1]} textAnchor="middle" dominantBaseline="middle" className="spiral-silence" fill="#8aa0c0" style={{ font: "italic 15px var(--font-serif)" }}>
              {SILENCE_DAYS} days of silence
            </text>
          </>
        )}
        {years.map((y) => (
          <text key={y.y} x={y.x} y={y.yy - 9} textAnchor="middle" fill="#8c877b" style={{ font: "11px var(--font-mono)", letterSpacing: "0.12em" }}>
            {y.y}
          </text>
        ))}
        {sorted.map((e, i) => {
          const [x, y] = pt(parseISO(e.date));
          return (
            <circle
              key={e.id}
              cx={x}
              cy={y}
              r={3.6}
              fill={CHAPTER_BY_ID[e.chapterId]?.visual.atmosphere ?? "#d9b779"}
              className="spiral-dot"
              style={{ ["--i" as string]: i } as CSSProperties}
            >
              <title>{e.title}</title>
            </circle>
          );
        })}
        <circle cx={C} cy={C} r={3} fill="#d9b779" />
      </svg>
    </div>
  );
}
