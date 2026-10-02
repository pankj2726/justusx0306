import { useMemo, useRef, type CSSProperties } from "react";
import { CHAPTERS, diffDays } from "../data/canonicalTimeline";
import { useCountUp, useReveal } from "../hooks/useReveal";
import { ROMAN } from "../lib/format";
import { formatDate } from "../lib/time";
import { useMemories } from "../store/MemoryStore";
import SectionHeader from "./SectionHeader";
import SpiralChart from "./SpiralChart";

function Count({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const v = useCountUp(value, ref);
  return (
    <span ref={ref} className="tabular-nums">
      {v.toLocaleString()}
    </span>
  );
}

export default function Stats() {
  const { events, allMedia } = useMemories();
  const bars = useReveal<HTMLDivElement>(0.2);

  const s = useMemo(() => {
    const t = (e: (typeof events)[number]) => `${e.title} ${e.description} ${e.location ?? ""}`;
    const count = (re: RegExp) => events.filter((e) => re.test(t(e))).length;
    const byMonth: Record<string, number> = {};
    events.forEach((e) => {
      byMonth[e.date.slice(0, 7)] = (byMonth[e.date.slice(0, 7)] ?? 0) + 1;
    });
    const busiest = Object.entries(byMonth).sort((a, b) => b[1] - a[1])[0];
    let longest = { days: 0, from: "", to: "" };
    for (let i = 1; i < events.length; i++) {
      const d = diffDays(events[i - 1].date, events[i].date);
      if (d > longest.days) longest = { days: d, from: events[i - 1].date, to: events[i].date };
    }
    return {
      pizza: count(/pizza/i),
      room: count(/\broom\b/i),
      dankaur: count(/dankaur/i),
      fights: count(/fight|argument/i),
      kisses: count(/kiss/i),
      birthdays: count(/birthday/i),
      firsts: count(/\bfirst\b/i),
      busiest,
      longest,
      media: allMedia.length,
      songs: events.filter((e) => e.extras.music).length,
    };
  }, [events, allMedia]);

  const figures = [
    { n: s.pizza, l: "Evenings at the pizza shop" },
    { n: s.room, l: "Afternoons in the room" },
    { n: s.firsts, l: "Firsts" },
    { n: s.birthdays, l: "Birthdays together" },
    { n: s.kisses, l: "Kisses written down" },
    { n: s.dankaur, l: "Days in Dankaur" },
    { n: s.fights, l: "Storms weathered" },
    { n: events.length, l: "Moments in total" },
  ];

  const perChapter = CHAPTERS.map((c) => ({ c, n: events.filter((e) => e.chapterId === c.id).length }));
  const max = Math.max(1, ...perChapter.map((x) => x.n));

  return (
    <section id="numbers" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8">
      <SectionHeader eyebrow="The measure" title={<>Us, <span className="italic text-gold">in numbers</span></>}>
        Some things can't be counted. These can.
      </SectionHeader>

      <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
        {figures.map((f) => (
          <div key={f.l} className="bg-night-2/90 p-6 sm:p-8">
            <div className="display text-6xl sm:text-7xl">
              <Count value={f.n} />
            </div>
            <div className="t-caption mt-4">{f.l}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="panel p-6 sm:p-9">
          <div className="t-label">Moments along the spiral</div>
          <p className="t-caption mt-2">The same time spiral as the galaxy, from the centre outward. The empty dashed arc is the silence.</p>
          <div className="mx-auto mt-4 max-w-[460px]">
            <SpiralChart events={events} />
          </div>
        </div>

        <div ref={bars} className="panel p-6 sm:p-9">
          <div className="t-label">Moments by chapter</div>
          <div className="mt-8 space-y-5">
            {perChapter.map(({ c, n }, i) => (
              <div key={c.id} className="grid grid-cols-[28px_1fr_32px] items-center gap-3">
                <span className="font-serif text-lg italic" style={{ color: c.visual.atmosphere }}>
                  {ROMAN[c.index]}
                </span>
                <div>
                  <div className="mb-1.5 truncate text-[13px] text-mist">{c.title}</div>
                  <div className="h-[3px] w-full rounded-full bg-white/5">
                    <div
                      className="bar-fill h-full rounded-full"
                      style={{ width: `${(n / max) * 100}%`, background: c.visual.atmosphere, boxShadow: `0 0 12px ${c.visual.atmosphere}`, ["--stagger-delay" as string]: `${i * 90}ms` } as CSSProperties}
                    />
                  </div>
                </div>
                <span className="text-right font-serif text-lg tabular-nums">
                  <Count value={n} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
        <div className="bg-night-2/90 p-7">
          <div className="t-label">Longest time apart</div>
          <div className="display mt-4 text-5xl">
            <Count value={s.longest.days} /> <span className="text-2xl italic text-mist">days</span>
          </div>
          <div className="t-label mt-2">{s.longest.from && `${formatDate(s.longest.from)} → ${formatDate(s.longest.to)}`}</div>
        </div>
        <div className="bg-night-2/90 p-7">
          <div className="t-label">Fullest month</div>
          <div className="display mt-4 text-5xl">
            {s.busiest && new Date(`${s.busiest[0]}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long" })}
            <span className="ml-2 text-2xl italic text-mist">{s.busiest?.[0].slice(0, 4)}</span>
          </div>
          <div className="t-label mt-2">{s.busiest?.[1]} moments in one month</div>
        </div>
        <div className="bg-night-2/90 p-7">
          <div className="t-label">In the archive</div>
          <div className="display mt-4 text-5xl">
            <Count value={s.media} /> <span className="text-2xl italic text-mist">files</span> · <Count value={s.songs} /> <span className="text-2xl italic text-mist">songs</span>
          </div>
          <div className="t-label mt-2">Photos, videos, voice notes & music</div>
        </div>
      </div>
    </section>
  );
}
