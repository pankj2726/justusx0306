import { useMemo } from "react";
import { CHAPTER_BY_ID } from "../data/canonicalTimeline";
import { useReveal } from "../hooks/useReveal";
import { Title } from "../lib/format";
import { formatDate, nextAnniversary } from "../lib/time";
import { useMemories } from "../store/MemoryStore";
import { IArrowR } from "./Icons";

export default function OnThisDay({ onOpen }: { onOpen: (id: string) => void }) {
  const { events } = useMemories();
  const ref = useReveal<HTMLDivElement>();

  const { today, upcoming, featured } = useMemo(() => {
    const now = new Date();
    const md = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const past = events.filter((e) => e.date.slice(5) === md && Number(e.date.slice(0, 4)) < now.getFullYear());
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const up = events
      .map((e) => ({ e, when: nextAnniversary(e.date, now) }))
      .filter((x) => x.when.getTime() > todayStart && x.when.getFullYear() > Number(x.e.date.slice(0, 4)))
      .sort((a, b) => a.when.getTime() - b.when.getTime())
      .slice(0, 5);
    const dayIdx = Math.floor(todayStart / 86_400_000);
    const meaningful = events.filter((e) => e.description.length > 60);
    return { today: past, upcoming: up, featured: meaningful[dayIdx % meaningful.length] ?? events[0] };
  }, [events]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const main = today[0] ?? featured;
  const color = CHAPTER_BY_ID[main.chapterId]?.visual.atmosphere ?? "#d9b779";

  return (
    <section id="today" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8">
      <div ref={ref} className="reveal grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <button onClick={() => onOpen(main.id)} className="panel group relative overflow-hidden p-8 text-left sm:p-12">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl transition-opacity group-hover:opacity-50" style={{ background: color }} />
          <div className="label !text-gold">
            {today.length ? `On this day · ${now.getFullYear() - Number(main.date.slice(0, 4))} years ago` : "A memory for today"}
          </div>
          <h3 className="display mt-6 text-4xl sm:text-5xl">
            <Title title={main.title} />
          </h3>
          <p className="mt-5 max-w-xl font-serif text-xl font-light italic leading-relaxed text-mist">“{main.description}”</p>
          <div className="mt-8 flex items-center gap-3 text-sm text-mist transition-colors group-hover:text-ivory">
            <span className="font-mono text-xs tracking-widest">{formatDate(main.date, { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}</span>
            <span className="h-px w-8 bg-line-2" />
            <span className="flex items-center gap-2">Open memory <IArrowR size={14} /></span>
          </div>
        </button>

        <div className="panel p-8">
          <div className="label">Coming anniversaries</div>
          <ul className="mt-6 divide-y divide-line">
            {upcoming.map(({ e, when }) => {
              const days = Math.round((when.getTime() - todayStart) / 86_400_000);
              const yrs = when.getFullYear() - Number(e.date.slice(0, 4));
              return (
                <li key={e.id}>
                  <button onClick={() => onOpen(e.id)} className="group flex w-full items-center justify-between gap-4 py-4 text-left">
                    <div className="min-w-0">
                      <div className="truncate font-serif text-xl transition-colors group-hover:text-gold">
                        <Title title={e.title} />
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-dim">
                        {when.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · {yrs} {yrs === 1 ? "year" : "years"}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-serif text-2xl font-light tabular-nums">{days}</div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-dim">days</div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
