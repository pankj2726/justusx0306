import { useEffect, useRef, useState } from "react";
import { CHAPTER_BY_ID, REUNION_EVENT, SILENCE_OPENING_EVENT, type PlatePresentation } from "../data/canonicalTimeline";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { ROMAN, Title } from "../lib/format";
import { embedForTrack } from "../lib/music";
import { breakdown, dayOfUs, formatDate, localDateFromISO, weekday } from "../lib/time";
import { useMemories } from "../store/MemoryStore";
import { IArrowL, IArrowR, IClose, IEdit, IExternal, IHeartFill, IMusic, IPin, IPlay } from "./Icons";
import MusicEmbed from "./MusicEmbed";
import SparklePlanet from "./SparklePlanet";

type Props = { eventId: string | null; onClose: () => void; onNavigate: (id: string) => void; onEdit?: (id: string) => void };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The memory reader. View-only for everyone; admins get an "Edit" button that opens the studio. */
export default function EventModal({ eventId, onClose, onNavigate, onEdit }: Props) {
  const { events, mediaByEvent } = useMemories();
  const idx = events.findIndex((e) => e.id === eventId);
  const event = idx >= 0 ? events[idx] : null;
  const prev = idx > 0 ? events[idx - 1] : null;
  const next = idx >= 0 && idx < events.length - 1 ? events[idx + 1] : null;
  const [lightbox, setLightbox] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const lbRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useFocusTrap(dialogRef, !!event);
  useFocusTrap(lbRef, lightbox !== null);

  const media = event ? mediaByEvent[event.id] ?? [] : [];
  const visual = media.filter((m) => m.kind !== "audio");
  const audio = media.filter((m) => m.kind === "audio");
  const go = (d: number) => setLightbox((i) => (i === null || !visual.length ? null : (i + d + visual.length) % visual.length));

  useEffect(() => {
    if (!event) return;
    scroller.current?.scrollTo({ top: 0 });
    setLightbox(null);
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!event) return;
    const onKey = (e: KeyboardEvent) => {
      if (lightbox !== null) {
        if (e.key === "Escape") setLightbox(null);
        if (e.key === "ArrowRight") setLightbox((i) => (i === null ? null : (i + 1) % visual.length));
        if (e.key === "ArrowLeft") setLightbox((i) => (i === null ? null : (i - 1 + visual.length) % visual.length));
        return;
      }
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && prev) onNavigate(prev.id);
      if (e.key === "ArrowRight" && next) onNavigate(next.id);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [event, prev, next, onClose, onNavigate, lightbox, visual.length]);

  // preload the neighbours in the lightbox
  useEffect(() => {
    if (lightbox === null || visual.length < 2) return;
    for (const j of [lightbox + 1, lightbox - 1]) {
      const m = visual[(j + visual.length) % visual.length];
      if (m?.kind === "photo") new Image().src = m.src;
    }
  }, [lightbox, visual]);

  if (!event) return null;

  const ch = CHAPTER_BY_ID[event.chapterId];
  const color = ch?.visual.atmosphere ?? "#d9b779";
  const cover = visual.find((m) => m.kind === "photo");
  const presentation: PlatePresentation = event.extras.presentation ?? event.presentation ?? "both";
  const track = event.extras.music ?? event.music;
  const showMusic = presentation !== "collage" && !!track && !!embedForTrack(track);
  const showGallery = presentation !== "spotify" && media.length > 0;
  const note = event.extras.note?.trim();
  const [yy, mm, dd] = event.date.split("-");
  const ago = breakdown(localDateFromISO(event.date), new Date());
  const agoText = ago.future ? `In ${ago.totalDays} days` : ago.totalDays === 0 ? "Today" : `${ago.years ? `${ago.years} yr ` : ""}${ago.months ? `${ago.months} mo ` : ""}${ago.days} d ago`;

  return (
    <div data-modal-open className="fade-in fixed inset-0 z-[60] bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div ref={scroller} className="h-full overflow-y-auto px-3 py-6 sm:px-6 sm:py-10">
        <article
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="memory-title"
          tabIndex={-1}
          className="rise relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-line bg-night-2 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* cinematic header */}
          <div className="relative h-[320px] overflow-hidden sm:h-[400px]">
            {cover ? (
              <>
                <img src={cover.src} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-55" style={{ filter: "blur(28px) saturate(1.1)" }} />
                <img
                  src={cover.src}
                  alt={cover.caption || event.title}
                  className="absolute inset-y-0 right-0 h-full w-full object-cover sm:w-[64%]"
                  style={{ maskImage: "linear-gradient(to right, transparent, #000 32%)", WebkitMaskImage: "linear-gradient(to right, transparent, #000 32%)" }}
                />
                <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 15% 100%, ${color}40, transparent 60%)` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-night-2 via-night-2/45 to-night-2/5" />
              </>
            ) : (
              <>
                <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 75% 40%, ${color}40, transparent 60%), radial-gradient(ellipse at 10% 100%, ${ch?.visual.nebula ?? color}40, transparent 55%)` }} />
                {ch && (
                  <div className="absolute -right-10 top-0 opacity-95 sm:right-6">
                    <SparklePlanet chapterId={ch.id} size={380} fit="system" zoom={1.25} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-night-2 via-night-2/30 to-transparent" />
              </>
            )}

            <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-5 sm:p-7">
              <span className="truncate rounded-full border border-white/15 bg-black/30 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ivory/90 backdrop-blur">
                {ch ? `${ROMAN[ch.index]} · ${ch.title}` : "Memory"}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {onEdit && (
                  <button onClick={() => onEdit(event.id)} className="flex h-11 items-center gap-2 rounded-full border border-gold/50 bg-black/40 px-4 text-[12px] text-gold backdrop-blur transition-colors hover:bg-black/60">
                    <IEdit size={14} /> Edit
                  </button>
                )}
                <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/30 text-ivory backdrop-blur transition-colors hover:bg-black/50" aria-label="Close memory">
                  <IClose size={18} />
                </button>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-6 sm:p-10">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.2em] text-mist">
                  <span style={{ color }}>Day {dayOfUs(event.date).toLocaleString()} of us</span>
                  <span>{weekday(event.date)}</span>
                  <span className="text-dim">{agoText}</span>
                </div>
                <h2 id="memory-title" className="display mt-4 max-w-3xl text-5xl sm:text-6xl">
                  <Title title={event.title} />
                </h2>
              </div>
              <div className="hidden shrink-0 text-right sm:block" aria-hidden>
                <div className="display text-7xl tabular-nums" style={{ color }}>
                  {dd}
                </div>
                <div className="t-label mt-1">
                  {MONTHS[Number(mm) - 1]} {yy}
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 pb-10 sm:px-10">
            {(event.location || event.id === REUNION_EVENT || event.id === SILENCE_OPENING_EVENT || event.extras.favorite) && (
              <div className="flex flex-wrap items-center gap-3 border-b border-line pb-6">
                <span className="t-label sm:hidden">{formatDate(event.date, { day: "numeric", month: "long", year: "numeric" })}</span>
                {event.location && (
                  <span className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[12px] text-mist">
                    <IPin size={13} /> {event.location}
                  </span>
                )}
                {(event.id === REUNION_EVENT || event.id === SILENCE_OPENING_EVENT) && (
                  <span className="rounded-full border px-3 py-1.5 text-[12px]" style={{ borderColor: `${color}66`, color }}>
                    {event.id === REUNION_EVENT ? "The day the 588-day silence ended" : "The last meeting before the silence"}
                  </span>
                )}
                {event.extras.favorite && (
                  <span className="flex items-center gap-1.5 rounded-full border border-rose/40 px-3 py-1.5 text-[12px] text-rose">
                    <IHeartFill size={12} /> A favourite
                  </span>
                )}
              </div>
            )}

            <div className={`mt-10 grid gap-12 ${showMusic ? "lg:grid-cols-[1.25fr_1fr]" : ""}`}>
              <div>
                <div className="t-label">The memory</div>
                <blockquote className="t-body-serif mt-5 border-l-2 pl-6 !text-[1.6rem] text-ivory/95" style={{ borderColor: color }}>
                  {event.description || <span className="text-mist">—</span>}
                </blockquote>
                {note && (
                  <div className="mt-10">
                    <div className="t-label">A note</div>
                    <p className="t-body-serif mt-4 whitespace-pre-line italic text-mist">{note}</p>
                  </div>
                )}
              </div>

              {showMusic && track && (
                <div>
                  <div className="t-label flex items-center gap-2">
                    <IMusic size={12} /> Soundtrack
                  </div>
                  <div className="mt-5" style={{ boxShadow: `0 20px 60px -30px ${color}` }}>
                    <MusicEmbed track={track} color={color} />
                  </div>
                  {track.spotifyUrl && (
                    <a href={track.spotifyUrl} target="_blank" rel="noreferrer" className="t-label mt-3 inline-flex min-h-[44px] items-center gap-1.5 !text-gold hover:!text-ivory">
                      Open in app <IExternal size={12} />
                    </a>
                  )}
                  {track.lyrics && track.lyrics.length > 0 && (
                    <div className="mt-4 space-y-1 font-serif text-xl italic leading-snug text-mist">
                      {track.lyrics.map((l, i) => (
                        <p key={i}>{l || "\u00A0"}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {showGallery && (
              <div className="mt-14 border-t border-line pt-10">
                <div className="t-label">Gallery · {media.length}</div>
                {visual.length > 0 && (
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {visual.map((m, i) => (
                      <figure key={m.id} className={`group ${i === 0 && visual.length > 2 ? "col-span-2 row-span-2" : ""}`}>
                        <button
                          onClick={() => setLightbox(i)}
                          className="relative block h-full w-full overflow-hidden rounded-xl ring-1 ring-line"
                          aria-label={`View ${m.kind === "photo" ? "photo" : "video"} ${i + 1} of ${visual.length}${m.caption ? `: ${m.caption}` : ""}`}
                        >
                          {m.kind === "photo" ? (
                            <img src={i === 0 && visual.length > 2 ? m.src : m.thumbSrc} alt={m.caption || `Photo from ${event.title}`} className="aspect-square h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                          ) : (
                            <>
                              <video src={m.src} className="aspect-square h-full w-full object-cover" muted playsInline preload="metadata" />
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-ivory backdrop-blur">
                                  <IPlay size={18} />
                                </span>
                              </span>
                            </>
                          )}
                          {m.caption && (
                            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left font-serif text-base italic text-ivory opacity-0 transition-opacity group-hover:opacity-100">
                              {m.caption}
                            </span>
                          )}
                        </button>
                      </figure>
                    ))}
                  </div>
                )}
                {audio.length > 0 && (
                  <div className="mt-6 space-y-2">
                    {audio.map((m) => (
                      <div key={m.id} className="flex items-center gap-4 rounded-xl border border-line p-3">
                        <IMusic size={16} className="shrink-0 text-gold" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-serif text-base italic text-mist">{m.caption || "Voice note"}</div>
                          <audio src={m.src} controls className="mt-1 h-9 w-full opacity-80" aria-label={m.caption || "Voice note"} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <nav aria-label="Other memories" className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
              <button disabled={!prev} onClick={() => prev && onNavigate(prev.id)} className="group bg-night-2 p-5 text-left transition-colors hover:bg-night-3 disabled:opacity-30">
                <div className="t-label flex items-center gap-2">
                  <IArrowL size={12} /> Previous
                </div>
                <div className="mt-2 truncate font-serif text-lg text-mist group-hover:text-ivory">{prev ? <Title title={prev.title} /> : "The beginning"}</div>
              </button>
              <button disabled={!next} onClick={() => next && onNavigate(next.id)} className="group bg-night-2 p-5 text-right transition-colors hover:bg-night-3 disabled:opacity-30">
                <div className="t-label flex items-center justify-end gap-2">
                  Next <IArrowR size={12} />
                </div>
                <div className="mt-2 truncate font-serif text-lg text-mist group-hover:text-ivory">{next ? <Title title={next.title} /> : "To be continued"}</div>
              </button>
            </nav>
          </div>
        </article>
      </div>

      {lightbox !== null && visual[lightbox] && (
        <div
          ref={lbRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Photo viewer, ${lightbox + 1} of ${visual.length}`}
          tabIndex={-1}
          className="fade-in fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-4 outline-none"
          onClick={(e) => {
            e.stopPropagation();
            setLightbox(null);
          }}
        >
          <figure
            className="flex max-h-full max-w-6xl flex-col items-center"
            style={{ touchAction: "pan-y" }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              swipe.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerUp={(e) => {
              const s = swipe.current;
              swipe.current = null;
              if (!s) return;
              const dx = e.clientX - s.x;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) go(dx < 0 ? 1 : -1);
            }}
          >
            {visual[lightbox].kind === "photo" ? (
              <img src={visual[lightbox].src} alt={visual[lightbox].caption || `Photo from ${event.title}`} className="max-h-[82vh] w-auto select-none rounded-lg object-contain" draggable={false} />
            ) : (
              <video src={visual[lightbox].src} controls autoPlay className="max-h-[82vh] rounded-lg" />
            )}
            <figcaption className="mt-4 font-serif text-xl italic text-mist">{visual[lightbox].caption || ""}</figcaption>
            <div className="t-label mt-1" aria-live="polite">
              {lightbox + 1} / {visual.length}
            </div>
          </figure>
          {visual.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 text-ivory hover:bg-white/5"
                aria-label="Previous photo"
              >
                <IArrowL />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 text-ivory hover:bg-white/5"
                aria-label="Next photo"
              >
                <IArrowR />
              </button>
            </>
          )}
          <button className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-ivory" onClick={() => setLightbox(null)} aria-label="Close photo viewer">
            <IClose />
          </button>
        </div>
      )}
    </div>
  );
}
