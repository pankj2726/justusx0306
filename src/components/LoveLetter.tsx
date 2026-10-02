import type { CSSProperties } from "react";
import { RELATIONSHIP_START, SILENCE_DAYS } from "../data/canonicalTimeline";
import { useNow, useReveal } from "../hooks/useReveal";
import { breakdown, localDateFromISO } from "../lib/time";
import { useMemories } from "../store/MemoryStore";
import Sparkle from "./Sparkle";
import SparklePlanet from "./SparklePlanet";

/** Splits text into word spans that fade in staggered when an ancestor gets `.in`. Text is unchanged. */
function Words({ text, delay = 0 }: { text: string; delay?: number }) {
  let i = 0;
  return (
    <>
      {text.split(/(\s+)/).map((part, k) =>
        /^\s+$/.test(part) ? (
          part
        ) : (
          <span key={k} className="w" style={{ ["--i" as string]: i++, ["--d" as string]: `${delay}ms` } as CSSProperties}>
            {part}
          </span>
        )
      )}
    </>
  );
}

export default function LoveLetter() {
  const { settings, events } = useMemories();
  const now = useNow(1000);
  const b = breakdown(localDateFromISO(RELATIONSHIP_START), now);
  const ref = useReveal<HTMLDivElement>(0.12);

  return (
    <section id="letter" className="relative mx-auto max-w-7xl px-5 py-32 sm:px-8">
      <div ref={ref} className="relative mx-auto max-w-3xl">
        <div className="pointer-events-none absolute -right-28 -top-28 hidden opacity-70 lg:block">
          <div className="drift">
            <SparklePlanet chapterId="ch-03" size={240} />
          </div>
        </div>

        <div className="parchment px-6 py-12 sm:px-14 sm:py-16">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-gold/60" />
            <Sparkle size={12} color="#d9b779" />
            <span className="t-label !text-gold">A letter</span>
          </div>
          <h2 className="display mt-6 text-6xl sm:text-7xl">
            Dear <span className="italic">{settings.herName}</span>,
          </h2>

          <div className="words t-body-serif mt-12 space-y-7 !max-w-none text-ivory/90 sm:!text-[1.6rem]">
            <p className="dropcap">
              <Words text="It began at a pizza shop, on your sister's birthday, and with a “no” I didn't know how to accept. Then a pendant. Then a yes, on your birthday — the best gift I was ever given." />
            </p>
            <p>
              <Words
                delay={700}
                text={`We were caught, and kept apart. We fought, and found our way back. There was the first hug that made the whole world go quiet, the first kiss, the first rain. And then there were ${SILENCE_DAYS} days I counted, one by one.`}
              />
            </p>
            <p>
              <Words delay={1500} text={`Somehow, the orbit held. ${events.length} moments are written here so far — and I would like to spend the rest of my life writing the next ones with you.`} />
            </p>
            <p className="text-mist">
              <span className="w" style={{ ["--i" as string]: 0, ["--d" as string]: "2300ms" } as CSSProperties}>
                {b.years} years, {b.months} months, {b.days} days, {b.hours} hours, {b.minutes} minutes and <span className="tabular-nums text-ivory">{b.seconds}</span> seconds. Still counting.
              </span>
            </p>
          </div>

          <div className="mt-14 text-right">
            <div className="font-serif text-2xl italic text-mist">Forever yours,</div>
            <div className="sig mt-1 inline-block font-serif text-5xl italic gold-text">{settings.hisName}</div>
          </div>
        </div>
      </div>

      <footer className="mx-auto mt-40 max-w-7xl">
        <div className="flex items-center gap-4" aria-hidden>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-line-2" />
          <Sparkle size={16} color="#d9b779" spin />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-line-2" />
        </div>
        <div className="mt-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="font-serif text-2xl font-light">
            {settings.hisName} <span className="italic text-gold">&</span> {settings.herName}
          </div>
          <div className="t-label">Since 09 · 10 · 2021 — everything you add stays on this device</div>
        </div>
      </footer>
    </section>
  );
}
