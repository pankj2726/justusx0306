import { useEffect, useRef } from "react";
import type { Chapter } from "../data/canonicalTimeline";
import { useReveal } from "../hooks/useReveal";
import { ROMAN } from "../lib/format";
import { prefersReducedMotion } from "../lib/quality";
import { formatDate } from "../lib/time";
import Sparkle from "./Sparkle";
import SparklePlanet from "./SparklePlanet";

type Props = { chapter: Chapter; count: number; first?: string; last?: string };

/** Full-viewport chapter title card with a slow parallax on the planet and numeral. */
export default function ChapterCard({ chapter: c, count, first, last }: Props) {
  const wrap = useRef<HTMLElement>(null);
  const planet = useRef<HTMLDivElement>(null);
  const numeral = useRef<HTMLDivElement>(null);
  const text = useReveal<HTMLDivElement>(0.2);

  useEffect(() => {
    const el = wrap.current;
    if (!el || prefersReducedMotion()) return;
    let raf = 0;
    let on = false;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      if (planet.current) planet.current.style.transform = `translate3d(0, ${(-p * 70).toFixed(1)}px, 0)`;
      if (numeral.current) numeral.current.style.transform = `translate3d(0, ${(p * 50).toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (on && !raf) raf = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(([e]) => {
      on = e.isIntersecting;
      if (on) onScroll();
    });
    io.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const v = c.visual;
  return (
    <section ref={wrap} id={c.id} aria-labelledby={`${c.id}-title`} className="relative flex min-h-[90svh] scroll-mt-16 items-center overflow-hidden py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse 70% 60% at 70% 45%, ${v.nebula}3d, transparent 70%), radial-gradient(ellipse 50% 50% at 12% 85%, ${v.atmosphere}14, transparent 70%)` }}
      />
      <div
        ref={numeral}
        aria-hidden
        className="pointer-events-none absolute left-0 top-[8%] select-none font-serif italic leading-none sm:left-4"
        style={{ fontSize: "min(46vw, 30rem)", color: v.atmosphere, opacity: 0.075 }}
      >
        {ROMAN[c.index]}
      </div>

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1.1fr_1fr]">
        <div ref={text} data-stagger="90" className="reveal">
          <div className="flex items-center gap-3">
            <Sparkle size={14} color={v.atmosphere} />
            <span className="t-label" style={{ color: v.atmosphere }}>
              Chapter {ROMAN[c.index]}
            </span>
          </div>
          <h3 id={`${c.id}-title`} className="t-title mt-5">
            {c.title}
          </h3>
          <p className="t-body-serif mt-6 italic text-mist">{c.summary}</p>
          <div className="t-label mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="text-ivory">
              {count} {count === 1 ? "moment" : "moments"}
            </span>
            {first && last && (
              <span>
                {formatDate(first, { month: "short", year: "numeric" })} — {formatDate(last, { month: "short", year: "numeric" })}
              </span>
            )}
          </div>
        </div>
        <div ref={planet} className="flex justify-center lg:justify-end">
          <SparklePlanet chapterId={c.id} size={320} fit="system" phase={c.index * 0.4} />
        </div>
      </div>
    </section>
  );
}
