import { useEffect, useState } from "react";
import type { ChapterId } from "../../data/canonicalTimeline";
import { ROMAN } from "../../lib/format";
import type { GalaxyLayout } from "../../three/galaxyScene";

type Props = {
  layout: GalaxyLayout | null;
  getFocus: () => { x: number; z: number } | null;
  onChapter: (id: ChapterId) => void;
  hidden?: boolean;
};

/** Top-down map of the spiral: memories, worlds, the empty void arc and the camera focus. */
export default function Minimap({ layout, getFocus, onChapter, hidden }: Props) {
  const [focus, setFocus] = useState<{ x: number; z: number } | null>(null);

  useEffect(() => {
    if (!layout || hidden) return;
    const t = window.setInterval(() => setFocus(getFocus()), 250);
    return () => window.clearInterval(t);
  }, [layout, getFocus, hidden]);

  if (!layout) return null;
  const S = 54 / layout.extent;
  const P = (x: number, z: number): [number, number] => [60 + x * S, 60 + z * S];
  const arc = layout.voidArc.map(([x, z]) => P(x, z).map((n) => n.toFixed(1)).join(",")).join(" ");

  return (
    <div
      className={`absolute bottom-3 left-3 z-10 rounded-2xl border border-line-2 bg-night/70 p-1.5 backdrop-blur-xl transition-opacity duration-500 sm:bottom-5 sm:left-5 lg:left-[340px] ${hidden ? "pointer-events-none opacity-0" : "opacity-100"}`}
      aria-hidden={hidden}
    >
      <svg viewBox="0 0 120 120" width={112} height={112} role="group" aria-label="Galaxy map">
        <circle cx={60} cy={60} r={57} fill="none" stroke="rgba(236,230,220,0.08)" />
        <polyline points={arc} fill="none" stroke="#8aa0c0" strokeOpacity={0.65} strokeWidth={1.1} strokeDasharray="1.5 3" strokeLinecap="round" />
        {layout.stars.map((s) => {
          const [x, y] = P(s.x, s.z);
          return <circle key={s.id} cx={x} cy={y} r={1.25} fill={s.color} opacity={0.9} />;
        })}
        {layout.planets.map((p) => {
          const [x, y] = P(p.x, p.z);
          return (
            <g
              key={p.id}
              role="button"
              tabIndex={hidden ? -1 : 0}
              aria-label={`Fly to chapter ${ROMAN[p.index]}: ${p.title}`}
              onClick={() => onChapter(p.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChapter(p.id);
                }
              }}
              className="cursor-pointer outline-none [&:focus-visible>circle:last-child]:stroke-[#d9b779]"
            >
              <circle cx={x} cy={y} r={7} fill="transparent" />
              <circle cx={x} cy={y} r={3.2} fill={p.color} stroke="rgba(0,0,0,0.6)" strokeWidth={0.8} />
            </g>
          );
        })}
        {focus && (() => {
          const [x, y] = P(focus.x, focus.z);
          return <circle cx={x} cy={y} r={5} fill="none" stroke="#d9b779" strokeWidth={1.2} />;
        })()}
        <circle cx={60} cy={60} r={1.6} fill="#ffc46b" />
      </svg>
    </div>
  );
}
