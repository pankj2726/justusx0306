import type { GalaxyEvent } from "../data/canonicalTimeline";
import { CHAPTER_BY_ID, REUNION_EVENT, SILENCE_OPENING_EVENT } from "../data/canonicalTimeline";
import { useReveal } from "../hooks/useReveal";
import { Title } from "../lib/format";
import type { EventExtras } from "../lib/storage";
import { dayOfUs, todayISO, weekday } from "../lib/time";
import { useMemories } from "../store/MemoryStore";
import { IHeart, IHeartFill, IImage, IMusic, IPin } from "./Icons";

type Props = {
  event: GalaxyEvent & { custom?: boolean; extras: EventExtras };
  onOpen: (id: string) => void;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function EventCard({ event, onOpen }: Props) {
  const ref = useReveal<HTMLLIElement>();
  const { mediaByEvent, setExtras, isAdmin } = useMemories();
  const ch = CHAPTER_BY_ID[event.chapterId];
  const color = ch?.visual.atmosphere ?? "#d9b779";
  const media = mediaByEvent[event.id] ?? [];
  const thumbs = media.filter((m) => m.kind !== "audio").slice(0, 4);
  const upcoming = event.date > todayISO();
  const [y, m, d] = event.date.split("-");
  const tag = event.id === REUNION_EVENT ? "The reunion" : event.id === SILENCE_OPENING_EVENT ? "Before the silence" : upcoming ? "Upcoming" : event.custom && isAdmin ? "Added" : null;

  return (
    <li ref={ref} className="reveal relative">
      {/* node on the rail */}
      <span className="absolute -left-[5px] top-9 h-[9px] w-[9px] rounded-full border border-night" style={{ background: color, boxShadow: `0 0 0 4px #07070b, 0 0 16px ${color}` }} />

      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(event.id)}
        onKeyDown={(e) => e.key === "Enter" && onOpen(event.id)}
        className="group relative ml-6 grid cursor-pointer grid-cols-[64px_1fr] gap-5 rounded-2xl border border-transparent p-5 transition-all duration-500 hover:border-line hover:bg-white/[0.022] sm:ml-10 sm:grid-cols-[92px_1fr] sm:gap-8 sm:p-7"
      >
        {/* date column */}
        <div className="pt-1">
          <div className="display text-5xl tabular-nums sm:text-6xl">{d}</div>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
            {MONTHS[Number(m) - 1]} {y}
          </div>
          <div className="mt-1 hidden font-mono text-[9px] uppercase tracking-[0.2em] text-dim sm:block">{weekday(event.date).slice(0, 3)}</div>
        </div>

        {/* body */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color }}>
              Day {dayOfUs(event.date).toLocaleString()}
            </span>
            {tag && (
              <span className="rounded-full border px-2 py-[1px] font-mono text-[9px] uppercase tracking-[0.18em]" style={{ borderColor: `${color}66`, color }}>
                {tag}
              </span>
            )}
          </div>

          <h3 className="mt-2 pr-10 font-serif text-[1.9rem] font-normal leading-[1.1] text-ivory transition-colors group-hover:text-white sm:text-[2.2rem]">
            <Title title={event.title} />
          </h3>
          <p className="mt-3 line-clamp-3 max-w-2xl text-[15px] leading-relaxed text-mist">{event.description}</p>

          {thumbs.length > 0 && (
            <div className="mt-5 flex gap-2">
              {thumbs.map((t) =>
                t.kind === "photo" ? (
                  <img key={t.id} src={t.thumbSrc} alt={t.caption || `Photo from ${event.title}`} className="h-20 w-20 rounded-lg object-cover opacity-90 ring-1 ring-line transition-opacity group-hover:opacity-100 sm:h-24 sm:w-24" loading="lazy" />
                ) : (
                  <video key={t.id} src={t.src} className="h-20 w-20 rounded-lg object-cover ring-1 ring-line sm:h-24 sm:w-24" muted playsInline preload="metadata" />
                )
              )}
              {media.length > thumbs.length && (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-line font-mono text-xs text-mist sm:h-24 sm:w-24">+{media.length - thumbs.length}</div>
              )}
            </div>
          )}

          {(event.location || event.extras.music || media.length > 0) && (
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-dim">
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <IPin size={13} /> {event.location}
                </span>
              )}
              {event.extras.music && (
                <span className="flex items-center gap-1.5 text-gold/80">
                  <IMusic size={13} /> {event.extras.music.title}
                  {event.extras.music.artist && <span className="text-dim">· {event.extras.music.artist}</span>}
                </span>
              )}
              {media.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <IImage size={13} /> {media.length}
                </span>
              )}
            </div>
          )}
        </div>

        {isAdmin ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExtras(event.id, { favorite: !event.extras.favorite });
            }}
            className={`absolute right-5 top-6 transition-all sm:right-7 sm:top-8 ${event.extras.favorite ? "text-rose" : "text-dim opacity-0 hover:text-rose group-hover:opacity-100"}`}
            aria-label="Favourite"
          >
            {event.extras.favorite ? <IHeartFill size={18} /> : <IHeart size={18} />}
          </button>
        ) : event.extras.favorite ? (
          <span className="absolute right-5 top-6 text-rose sm:right-7 sm:top-8" title="A favourite">
            <IHeartFill size={18} />
          </span>
        ) : null}
      </div>
    </li>
  );
}
