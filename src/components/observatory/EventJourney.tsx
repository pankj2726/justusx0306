import { useRef } from "react";
import { CHAPTER_BY_ID, REUNION_EVENT, SILENCE_OPENING_EVENT, type GalaxyEvent } from "../../data/canonicalTimeline";
import { ROMAN, Title } from "../../lib/format";
import type { EventExtras } from "../../lib/storage";
import { dayOfUs, formatDate, weekday } from "../../lib/time";
import type { MediaItem } from "../../store/MemoryStore";
import { IArrowL, IArrowR, IClose, IPin } from "../Icons";
import MusicEmbed from "../MusicEmbed";

type Props = {
  open: boolean;
  event: (GalaxyEvent & { extras: EventExtras }) | undefined;
  index: number;
  total: number;
  media: MediaItem[];
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onOpenFull: (id: string) => void;
};

/** Travelling star to star inside the galaxy. Swipe left/right on touch. */
export default function EventJourney({ open, event, index, total, media, onPrev, onNext, onClose, onOpenFull }: Props) {
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const ch = event ? CHAPTER_BY_ID[event.chapterId] : null;
  const color = ch?.visual.atmosphere ?? "#d9b779";
  const visual = media.filter((m) => m.kind !== "audio").slice(0, 4);

  return (
    <div
      className={`absolute inset-x-3 bottom-3 z-20 transition-all duration-700 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[410px] ${
        open && event ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"
      }`}
      aria-hidden={!open}
    >
      {event && ch && (
        <section
          aria-label={`Memory ${index + 1} of ${total}`}
          className="flex max-h-[62svh] flex-col overflow-hidden rounded-2xl border border-line-2 bg-night/85 backdrop-blur-2xl sm:max-h-[calc(82vh-7rem)]"
          style={{ boxShadow: `0 30px 80px -30px ${color}66`, touchAction: "pan-y" }}
          onPointerDown={(e) => {
            if (e.pointerType !== "mouse") swipe.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            const s = swipe.current;
            swipe.current = null;
            if (!s) return;
            const dx = e.clientX - s.x;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.4) {
              if (dx < 0 && index < total - 1) onNext();
              if (dx > 0 && index > 0) onPrev();
            }
          }}
        >
          <div className="h-[2px] w-full bg-white/5" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1} aria-label="Position in the story">
            <div className="h-full transition-[width] duration-500" style={{ width: `${((index + 1) / Math.max(1, total)) * 100}%`, background: color }} />
          </div>
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color }}>
              World {ROMAN[ch.index]} · Day {dayOfUs(event.date).toLocaleString()} of us
            </span>
            <div className="flex items-center gap-3">
              <span className="t-label">
                {index + 1} / {total}
              </span>
              <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-dim hover:text-ivory" aria-label="Close memory panel">
                <IClose size={15} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto px-5 py-4">
            <div className="t-label">
              {weekday(event.date)}, {formatDate(event.date, { day: "numeric", month: "long", year: "numeric" })}
            </div>
            <h4 className="mt-2 font-serif text-[1.9rem] leading-[1.08]">
              <Title title={event.title} />
            </h4>
            {(event.id === REUNION_EVENT || event.id === SILENCE_OPENING_EVENT) && (
              <div className="mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[11px]" style={{ borderColor: `${color}66`, color }}>
                {event.id === REUNION_EVENT ? "The day the 588-day silence ended" : "The last meeting before the silence"}
              </div>
            )}
            <p className="mt-3 font-serif text-[1.12rem] font-light leading-relaxed text-ivory/90">{event.description}</p>
            {event.location && (
              <div className="mt-3 flex items-center gap-1.5 text-[12px] text-dim">
                <IPin size={12} /> {event.location}
              </div>
            )}
            {event.extras.music && (
              <div className="mt-4">
                <MusicEmbed track={event.extras.music} compact color={color} />
              </div>
            )}
            {visual.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-1.5">
                {visual.map((m) =>
                  m.kind === "photo" ? (
                    <img key={m.id} src={m.thumbSrc} alt={m.caption || `Photo from ${event.title}`} className="aspect-square w-full rounded-lg object-cover ring-1 ring-line" />
                  ) : (
                    <video key={m.id} src={m.src} className="aspect-square w-full rounded-lg object-cover ring-1 ring-line" muted playsInline preload="metadata" />
                  )
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-t border-line p-3">
            <button onClick={onPrev} disabled={index <= 0} className="flex h-11 w-11 items-center justify-center rounded-full border border-line-2 text-mist hover:text-ivory disabled:opacity-30" aria-label="Previous star">
              <IArrowL size={15} />
            </button>
            <button onClick={() => onOpenFull(event.id)} className="btn btn-primary !h-11 justify-center !text-[12px]">
              Open memory · music & photos
            </button>
            <button onClick={onNext} disabled={index >= total - 1} className="flex h-11 w-11 items-center justify-center rounded-full border border-line-2 text-mist hover:text-ivory disabled:opacity-30" aria-label="Next star">
              <IArrowR size={15} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
