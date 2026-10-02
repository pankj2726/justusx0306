import { useEffect, useMemo, useRef } from "react";
import { CHAPTER_BY_ID, CHAPTERS, REUNION_EVENT } from "../data/canonicalTimeline";
import { useReveal } from "../hooks/useReveal";
import { ROMAN, Title } from "../lib/format";
import { prefersReducedMotion } from "../lib/quality";
import { formatDate } from "../lib/time";
import { useMemories, type MediaItem, type StoreEvent } from "../store/MemoryStore";
import { IImage, IMusic } from "./Icons";
import MusicEmbed from "./MusicEmbed";
import SectionHeader from "./SectionHeader";
import Sparkle from "./Sparkle";

/** Muted video that plays only while in view (never under reduced motion). */
function InViewVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduced = prefersReducedMotion();
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !reduced) v.play().catch(() => undefined);
        else v.pause();
      },
      { threshold: 0.35 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return <video ref={ref} src={src} className={className} muted loop playsInline preload="metadata" />;
}

type Item = { m: MediaItem; e: StoreEvent };

function Tile({ item, hero, onOpen }: { item: Item; hero?: boolean; onOpen: (id: string) => void }) {
  const { m, e } = item;
  return (
    <button
      type="button"
      onClick={() => onOpen(e.id)}
      className={`group relative block w-full overflow-hidden rounded-xl ring-1 ring-line ${hero ? "" : "mb-4 break-inside-avoid"}`}
      aria-label={`Open “${e.title}”${m.caption ? ` — ${m.caption}` : ""}`}
    >
      {m.kind === "photo" ? (
        <img src={hero ? m.src : m.thumbSrc} alt={m.caption || e.title} className={`develop w-full group-hover:scale-[1.03] ${hero ? "aspect-[16/9] object-cover" : ""}`} loading="lazy" />
      ) : (
        <InViewVideo src={m.src} className={`w-full ${hero ? "aspect-[16/9] object-cover" : ""}`} />
      )}
      <div className={`absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/10 to-transparent p-4 text-left transition-opacity duration-500 ${hero ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}>
        <div className="t-label !text-gold">{formatDate(e.date)}</div>
        <div className={`mt-1 font-serif leading-tight ${hero ? "text-3xl" : "text-lg"}`}>{m.caption || <Title title={e.title} />}</div>
      </div>
    </button>
  );
}

function ChapterGroup({ chapterId, items, onOpen }: { chapterId: string; items: Item[]; onOpen: (id: string) => void }) {
  const ref = useReveal<HTMLDivElement>(0.02);
  const c = CHAPTER_BY_ID[chapterId];
  const heroIdx = Math.max(0, items.findIndex((x) => x.m.kind === "photo"));
  const rest = items.filter((_, i) => i !== heroIdx);
  return (
    <div ref={ref} className="relative">
      <div className="sticky top-16 z-10 -mx-5 flex items-center gap-3 border-b border-line bg-night/80 px-5 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-full sm:border sm:px-4">
        <Sparkle size={12} color={c?.visual.atmosphere} />
        <span className="font-serif text-lg italic" style={{ color: c?.visual.atmosphere }}>
          {c ? ROMAN[c.index] : ""}
        </span>
        <span className="truncate font-serif text-lg">{c?.title}</span>
        <span className="t-label ml-auto shrink-0">
          {items.length} {items.length === 1 ? "piece" : "pieces"}
        </span>
      </div>
      <div className="mt-5">
        <Tile item={items[heroIdx]} hero onOpen={onOpen} />
      </div>
      {rest.length > 0 && (
        <div className="mt-4 columns-2 gap-4 sm:columns-3 lg:columns-4">
          {rest.map((it) => (
            <Tile key={it.m.id} item={it} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Scrapbook({ onOpen }: { onOpen: (id: string) => void }) {
  const { allMedia, events, isAdmin } = useMemories();
  const songs = events.filter((e) => e.extras.music);

  const groups = useMemo(() => {
    const byEvent = new Map(events.map((e) => [e.id, e]));
    const out: { chapterId: string; items: Item[] }[] = [];
    for (const c of CHAPTERS) {
      const items: Item[] = [];
      for (const m of allMedia) {
        if (m.kind === "audio") continue;
        const e = byEvent.get(m.eventId);
        if (e && e.chapterId === c.id) items.push({ m, e });
      }
      items.sort((a, b) => (a.e.date < b.e.date ? -1 : a.e.date > b.e.date ? 1 : a.m.createdAt - b.m.createdAt));
      if (items.length) out.push({ chapterId: c.id, items });
    }
    return out;
  }, [events, allMedia]);

  return (
    <section id="gallery" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8">
      <SectionHeader eyebrow="The archive" title={<>Photographs <span className="italic text-gold">&</span> songs</>}>
        Everything pinned to our moments, gathered chapter by chapter.
      </SectionHeader>

      {groups.length === 0 ? (
        <div className="panel mt-14 flex flex-col items-center px-8 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line-2 text-gold">
            <IImage size={22} />
          </div>
          <p className="mt-6 font-serif text-3xl font-light">The archive is waiting for its first photograph.</p>
          <p className="t-body mt-3 max-w-md text-mist">
            {isAdmin ? "Open the studio, choose a memory and add photos, videos or voice notes." : "Photographs will appear here as they're added to our moments."}
          </p>
          <button onClick={() => onOpen(REUNION_EVENT)} className="btn btn-primary mt-8">
            Begin with “588 Days Later”
          </button>
        </div>
      ) : (
        <div className="mt-14 space-y-16">
          {groups.map((g) => (
            <ChapterGroup key={g.chapterId} chapterId={g.chapterId} items={g.items} onOpen={onOpen} />
          ))}
        </div>
      )}

      <div className="mt-24">
        <div className="flex items-center gap-4">
          <IMusic size={16} className="text-gold" />
          <span className="t-label">Our soundtrack · {songs.length}</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        {songs.length === 0 ? (
          <p className="mt-6 font-serif text-xl italic text-mist">
            {isAdmin ? "No songs yet — in the studio, choose a memory and paste a Spotify link under “Song”." : "Songs will appear here as they're pinned to our moments."}
          </p>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {songs.map((e) => (
              <div key={e.id}>
                <button onClick={() => onOpen(e.id)} className="mb-3 flex min-h-[44px] w-full items-baseline justify-between gap-4 text-left">
                  <span className="truncate font-serif text-xl hover:text-gold">
                    <Title title={e.title} />
                  </span>
                  <span className="t-label shrink-0">{formatDate(e.date)}</span>
                </button>
                <MusicEmbed track={e.extras.music} color={CHAPTER_BY_ID[e.chapterId]?.visual.atmosphere} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
