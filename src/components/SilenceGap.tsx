import { useEffect, useRef, useState } from "react";
import { SILENCE_DAYS, SILENCE_END, SILENCE_START } from "../data/canonicalTimeline";
import { breakdown, formatDate, localDateFromISO } from "../lib/time";

export default function SilenceGap() {
  const ref = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(0);
  const b = breakdown(localDateFromISO(SILENCE_START), localDateFromISO(SILENCE_END));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        const start = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / 4200);
          const eased = 1 - Math.pow(1 - p, 3);
          setLit(Math.round(eased * SILENCE_DAYS));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        io.disconnect();
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="relative my-28 overflow-hidden rounded-3xl border border-line bg-[#05050a] px-6 py-16 sm:px-14 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(138,160,192,0.10),transparent_60%)]" />
      <div className="relative grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-center">
        <div>
          <div className="label !text-[#8aa0c0]">Interlude · the silence</div>
          <div className="display mt-6 text-[7rem] tabular-nums text-ivory sm:text-[10rem]">{lit}</div>
          <div className="font-serif text-2xl italic text-mist">days without you</div>
          <div className="mt-8 space-y-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-dim">
            <div>{formatDate(SILENCE_START, { day: "2-digit", month: "long", year: "numeric" })} — {formatDate(SILENCE_END, { day: "2-digit", month: "long", year: "numeric" })}</div>
            <div>
              {b.years} year · {b.months} months · {b.days} days · {(SILENCE_DAYS * 24).toLocaleString()} hours
            </div>
          </div>
        </div>
        <div>
          <div className="flex flex-wrap gap-[4px]">
            {Array.from({ length: SILENCE_DAYS }).map((_, i) => (
              <span
                key={i}
                className="h-[6px] w-[6px] rounded-full transition-colors duration-500"
                style={{
                  background: i < lit ? (i === SILENCE_DAYS - 1 ? "#e5a0a9" : "rgba(138,160,192,0.55)") : "rgba(236,230,220,0.06)",
                  boxShadow: i === SILENCE_DAYS - 1 && lit >= SILENCE_DAYS ? "0 0 10px #e5a0a9" : undefined,
                }}
              />
            ))}
          </div>
          <p className="mt-10 max-w-md font-serif text-2xl font-light italic leading-snug text-mist">
            Every one of them counted. And on the five hundred and eighty-eighth, <span className="text-rose">we found our way back.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
