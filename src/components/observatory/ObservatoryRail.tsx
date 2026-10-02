import { CHAPTERS, type ChapterId } from "../../data/canonicalTimeline";
import { UI_COPY } from "../../data/galaxyCopy";
import { ROMAN } from "../../lib/format";
import type { QualityTier } from "../../three/galaxyScene";
import { IClose } from "../Icons";

type Props = {
  open: boolean;
  onClose: () => void;
  counts: Record<string, number>;
  activeChapter: string | null;
  onChapter: (id: ChapterId) => void;
  onRandom: () => void;
  onSilence: () => void;
  onPresent: () => void;
  onHome: () => void;
  timeline: number;
  onTimeline: (v: number) => void;
  timelineLabel: string;
  quality: QualityTier;
  onQuality: (q: QualityTier) => void;
  reduced: boolean;
  onReduced: (b: boolean) => void;
  sound: boolean;
  onSound: (b: boolean) => void;
  life: { expansion: boolean; ufo: boolean; falling: boolean; discoveries: boolean };
  onLife: (key: "expansion" | "ufo" | "falling" | "discoveries", value: boolean) => void;
  discoveryCount: { found: number; total: number };
  onOpenDiscoveries: () => void;
  wishCount: number;
  onOpenWishes: () => void;
};

export default function ObservatoryRail(p: Props) {
  return (
    <aside
      className={`absolute bottom-3 left-3 top-16 z-20 flex w-[min(86vw,300px)] flex-col overflow-hidden rounded-2xl border border-line-2 bg-night/75 backdrop-blur-2xl transition-all duration-500 sm:bottom-5 sm:left-5 sm:top-20 ${
        p.open ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-[110%] opacity-0 lg:pointer-events-auto lg:translate-x-0 lg:opacity-100"
      }`}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <div className="label !text-gold">Observatory</div>
          <div className="mt-1 font-serif text-lg italic text-mist">seven worlds</div>
        </div>
        <button onClick={p.onClose} className="text-dim hover:text-ivory lg:hidden" aria-label="Close rail">
          <IClose size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ol className="py-2">
          {CHAPTERS.map((c) => {
            const active = p.activeChapter === c.id;
            return (
              <li key={c.id}>
                <button
                  onClick={() => p.onChapter(c.id)}
                  className={`group flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors ${active ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}`}
                >
                  <span className="h-5 w-5 shrink-0 rounded-full" style={{ background: `radial-gradient(circle at 35% 30%, ${c.visual.atmosphere}, ${c.visual.base} 55%, #050508)`, boxShadow: `0 0 10px ${c.visual.atmosphere}55` }} />
                  <span className="w-6 font-serif text-sm italic" style={{ color: c.visual.atmosphere }}>
                    {ROMAN[c.index]}
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-[13px] ${active ? "text-ivory" : "text-mist group-hover:text-ivory"}`}>{c.title}</span>
                  <span className="font-mono text-[10px] text-dim">{p.counts[c.id] ?? 0}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="grid grid-cols-2 gap-2 border-t border-line p-4">
          <button onClick={p.onRandom} className="col-span-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2.5 text-[12px] tracking-wide text-gold transition-colors hover:bg-gold/20">
            ✦ Take me somewhere
          </button>
          <button onClick={p.onSilence} className="rounded-xl border border-line-2 px-3 py-2 text-[12px] text-[#8aa0c0] hover:border-[#8aa0c0]/50">
            The silence
          </button>
          <button onClick={p.onPresent} className="rounded-xl border border-line-2 px-3 py-2 text-[12px] text-rose hover:border-rose/50">
            The present
          </button>
          <button onClick={p.onHome} className="col-span-2 rounded-xl border border-line-2 px-3 py-2 text-[12px] text-mist hover:text-ivory">
            Whole galaxy
          </button>
        </div>

        <div className="border-t border-line p-4">
          <div className="flex items-baseline justify-between">
            <span className="label">Time</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-gold">{p.timelineLabel}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={p.timeline}
            onChange={(e) => p.onTimeline(Number(e.target.value))}
            className="mt-3 w-full accent-[#d9b779]"
            aria-label="Timeline"
          />
          <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-widest text-dim">
            <span>2021</span>
            <button onClick={() => p.onTimeline(1)} className="hover:text-ivory">
              now
            </button>
          </div>
        </div>

        <div className="space-y-3 border-t border-line p-4">
          <div className="flex items-center justify-between">
            <span className="label">Quality</span>
            <div className="flex rounded-full border border-line p-0.5">
              {(["low", "medium", "high"] as QualityTier[]).map((q) => (
                <button key={q} onClick={() => p.onQuality(q)} className={`rounded-full px-2.5 py-0.5 text-[10.5px] capitalize ${p.quality === q ? "bg-ivory text-night" : "text-mist"}`}>
                  {q === "medium" ? "Med" : q}
                </button>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-center justify-between">
            <span className="label">Reduced motion</span>
            <input type="checkbox" checked={p.reduced} onChange={(e) => p.onReduced(e.target.checked)} className="h-4 w-4 accent-[#d9b779]" />
          </label>
          <label className="flex cursor-pointer items-center justify-between">
            <span className="label">Sound</span>
            <input type="checkbox" checked={p.sound} onChange={(e) => p.onSound(e.target.checked)} className="h-4 w-4 accent-[#d9b779]" aria-label="Galaxy sound (soft chimes)" />
          </label>
        </div>

        <div className="space-y-3 border-t border-line p-4">
          <div className="label">{UI_COPY.galaxyLife}</div>
          {(
            [
              ["expansion", UI_COPY.lifeExpansion],
              ["ufo", UI_COPY.lifeUfo],
              ["falling", UI_COPY.lifeFalling],
              ["discoveries", UI_COPY.lifeDiscoveries],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className={`flex min-h-[32px] cursor-pointer items-center justify-between gap-3 ${key !== "expansion" && !p.life.expansion ? "opacity-40" : ""}`}>
              <span className="text-[13px] text-mist">{label}</span>
              <input
                type="checkbox"
                checked={p.life[key]}
                disabled={key !== "expansion" && !p.life.expansion}
                onChange={(e) => p.onLife(key, e.target.checked)}
                className="h-4 w-4 accent-[#d9b779]"
              />
            </label>
          ))}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {p.life.expansion && p.life.discoveries ? (
              <button onClick={p.onOpenDiscoveries} className="min-h-[44px] rounded-xl border border-gold/40 bg-gold/10 px-3 text-[12px] text-gold hover:bg-gold/20">
                ✦ {UI_COPY.discoveries} {p.discoveryCount.found}/{p.discoveryCount.total}
              </button>
            ) : (
              <span />
            )}
            <button onClick={p.onOpenWishes} className="min-h-[44px] rounded-xl border border-line-2 px-3 text-[12px] text-mist hover:text-ivory">
              {UI_COPY.wishes} · {p.wishCount}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
