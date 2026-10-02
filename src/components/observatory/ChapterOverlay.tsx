import type { Chapter, GalaxyEvent } from "../../data/canonicalTimeline";
import { ROMAN, Title } from "../../lib/format";
import { formatDate } from "../../lib/time";
import { IArrowR, IClose } from "../Icons";
import SparklePlanet from "../SparklePlanet";

type Props = { chapter: Chapter | null; events: GalaxyEvent[]; onClose: () => void; onEvent: (id: string) => void; onRead: (id: string) => void };

export default function ChapterOverlay({ chapter, events, onClose, onEvent, onRead }: Props) {
  return (
    <aside
      className={`absolute bottom-3 right-3 top-16 z-20 flex w-[min(92vw,370px)] flex-col overflow-hidden rounded-2xl border border-line-2 bg-night/80 backdrop-blur-2xl transition-all duration-700 sm:bottom-5 sm:right-5 sm:top-20 ${
        chapter ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[110%] opacity-0"
      }`}
    >
      {chapter && (
        <>
          <div className="relative border-b border-line p-5">
            <button onClick={onClose} className="absolute right-4 top-4 text-dim hover:text-ivory" aria-label="Close">
              <IClose size={16} />
            </button>
            <div className="flex items-center gap-4">
              <SparklePlanet chapterId={chapter.id} size={84} className="-m-2 shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-[9.5px] uppercase tracking-[0.2em]" style={{ color: chapter.visual.atmosphere }}>
                  World {ROMAN[chapter.index]} · {events.length} stars
                </div>
                <div className="mt-1 font-serif text-2xl leading-tight">{chapter.title}</div>
              </div>
            </div>
            <p className="mt-3 font-serif text-[15px] italic leading-snug text-mist">{chapter.summary}</p>
          </div>
          <ol className="flex-1 divide-y divide-line overflow-y-auto">
            {events.map((e) => (
              <li key={e.id}>
                <button onClick={() => onEvent(e.id)} className="group flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.03]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: chapter.visual.atmosphere, boxShadow: `0 0 8px ${chapter.visual.atmosphere}` }} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[9.5px] uppercase tracking-[0.18em] text-dim">{formatDate(e.date, { day: "2-digit", month: "short", year: "numeric" })}</span>
                    <span className="block truncate font-serif text-[17px] group-hover:text-gold">
                      <Title title={e.title} />
                    </span>
                  </span>
                  <IArrowR size={13} className="mt-4 shrink-0 text-dim opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </li>
            ))}
          </ol>
          <button onClick={() => onRead(chapter.id)} className="flex items-center justify-center gap-2 border-t border-line py-3 font-mono text-[10px] uppercase tracking-widest text-mist hover:text-ivory">
            Read the chapter <IArrowR size={12} />
          </button>
        </>
      )}
    </aside>
  );
}
