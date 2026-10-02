import { Fragment, useMemo, useState } from "react";
import { CHAPTERS, SILENCE_DAYS, SILENCE_START } from "../data/canonicalTimeline";
import { useReveal } from "../hooks/useReveal";
import { useMemories, type StoreEvent } from "../store/MemoryStore";
import ChapterCard from "./ChapterCard";
import EventCard from "./EventCard";
import { ISearch } from "./Icons";
import SectionHeader from "./SectionHeader";
import SilenceGap from "./SilenceGap";

type FilterKey = "all" | "fav" | "firsts" | "birthdays" | "pizza" | "room" | "dankaur" | "fights" | "media" | "music";

const FILTERS: { k: FilterKey; label: string }[] = [
  { k: "all", label: "All" },
  { k: "fav", label: "Favourites" },
  { k: "firsts", label: "Firsts" },
  { k: "birthdays", label: "Birthdays" },
  { k: "pizza", label: "Pizza shop" },
  { k: "room", label: "The room" },
  { k: "dankaur", label: "Dankaur" },
  { k: "fights", label: "Storms" },
  { k: "media", label: "With photos" },
  { k: "music", label: "With music" },
];

/** The chronicle rail for one chapter — the rail line draws down when it enters. */
function ChapterEvents({ list, isFiltered, onOpen }: { list: StoreEvent[]; isFiltered: boolean; onOpen: (id: string) => void }) {
  const ref = useReveal<HTMLOListElement>(0);
  return (
    <ol ref={ref} className="rail-draw relative border-l border-line">
      {list.map((e) => (
        <Fragment key={e.id}>
          <EventCard event={e} onOpen={onOpen} />
          {e.date === SILENCE_START && isFiltered && <li className="ml-10 list-none py-6 font-serif text-lg italic text-[#8aa0c0]">— {SILENCE_DAYS} days of silence follow —</li>}
        </Fragment>
      ))}
    </ol>
  );
}

export default function Timeline({ onOpen }: { onOpen: (id: string) => void }) {
  const { events, mediaByEvent } = useMemories();
  const [q, setQ] = useState("");
  const [f, setF] = useState<FilterKey>("all");
  const [year, setYear] = useState("all");

  const years = useMemo(() => Array.from(new Set(events.map((e) => e.date.slice(0, 4)))), [events]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return events.filter((e) => {
      const text = `${e.title} ${e.description} ${e.location ?? ""}`.toLowerCase();
      if (qq && !text.includes(qq) && !e.date.includes(qq)) return false;
      if (year !== "all" && !e.date.startsWith(year)) return false;
      switch (f) {
        case "fav":
          return !!e.extras.favorite;
        case "media":
          return (mediaByEvent[e.id]?.length ?? 0) > 0;
        case "music":
          return !!e.extras.music;
        case "pizza":
          return /pizza/.test(text);
        case "room":
          return /\broom\b/.test(text);
        case "dankaur":
          return /dankaur/.test(text);
        case "firsts":
          return /\bfirst\b/.test(text);
        case "birthdays":
          return /birthday/.test(text);
        case "fights":
          return /fight|argument/.test(text);
        default:
          return true;
      }
    });
  }, [events, q, f, year, mediaByEvent]);

  const isFiltered = !!q || f !== "all" || year !== "all";

  return (
    <section id="timeline" className="relative py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader eyebrow="The chronicle" title={<>Every moment, <span className="italic text-gold">in order</span></>}>
          Seven chapters, each opening with its own world. Open any moment to read it, see its photographs and hear its song.
        </SectionHeader>

        {/* quiet filter bar */}
        <div className="sticky top-16 z-30 -mx-5 mt-14 border-y border-line/60 bg-night/75 px-5 py-2.5 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Search moments</span>
              <ISearch size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-dim" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search moments, places, dates…" className="field min-h-[44px] !rounded-full !border-line/70 !bg-transparent !py-2 !pl-11 md:min-h-0" />
            </label>
            <label className="md:w-40">
              <span className="sr-only">Year</span>
              <select value={year} onChange={(e) => setYear(e.target.value)} className="field min-h-[44px] !rounded-full !border-line/70 !bg-transparent !py-2 md:min-h-0">
                <option value="all" className="bg-night">
                  All years
                </option>
                {years.map((y) => (
                  <option key={y} value={y} className="bg-night">
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="no-scrollbar mt-2 flex gap-1 overflow-x-auto" role="group" aria-label="Filter moments">
            {FILTERS.map((x) => (
              <button
                key={x.k}
                type="button"
                onClick={() => setF(x.k)}
                aria-pressed={f === x.k}
                className={`min-h-[44px] shrink-0 rounded-full px-3.5 text-[12px] tracking-wide transition-colors md:min-h-0 md:py-1.5 ${f === x.k ? "bg-ivory text-night" : "text-mist hover:text-ivory"}`}
              >
                {x.label}
              </button>
            ))}
            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setF("all");
                  setYear("all");
                }}
                className="t-label ml-auto min-h-[44px] shrink-0 px-3 !text-gold md:min-h-0"
              >
                {filtered.length}/{events.length} · Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        {filtered.length === 0 && <div className="py-24 text-center font-serif text-3xl italic text-mist">Nothing matches that — try another word.</div>}

        {CHAPTERS.map((c) => {
          const list = filtered.filter((e) => e.chapterId === c.id);
          const all = events.filter((e) => e.chapterId === c.id);
          if (!list.length) return null;
          return (
            <div key={c.id} data-chapter-section={c.id}>
              {c.id === "ch-07" && !isFiltered && (
                <div className="mx-auto max-w-7xl px-5 sm:px-8">
                  <SilenceGap />
                </div>
              )}
              <ChapterCard chapter={c} count={all.length} first={all[0]?.date} last={all[all.length - 1]?.date} />
              <div className="mx-auto max-w-4xl px-3 pb-24 sm:px-8">
                <ChapterEvents list={list} isFiltered={isFiltered} onOpen={onOpen} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
