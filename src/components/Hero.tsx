import { RELATIONSHIP_START, SILENCE_END } from "../data/canonicalTimeline";
import { useNow } from "../hooks/useReveal";
import { breakdown, localDateFromISO, nextAnniversary } from "../lib/time";
import { useMemories } from "../store/MemoryStore";
import { IArrowDown } from "./Icons";
import SparklePlanet from "./SparklePlanet";

function Unit({ value, label, pad = 2 }: { value: number; label: string; pad?: number }) {
  const str = String(value).padStart(pad, "0");
  return (
    <div className="flex flex-col items-center px-3 sm:px-6">
      <div className="display text-5xl tabular-nums sm:text-7xl lg:text-8xl">
        <span key={str} className="tick">{str}</span>
      </div>
      <div className="label mt-3">{label}</div>
    </div>
  );
}

export default function Hero({ onAddEvent }: { onAddEvent: () => void }) {
  const now = useNow(1000);
  const { settings, events, isAdmin } = useMemories();
  const start = localDateFromISO(RELATIONSHIP_START);
  const b = breakdown(start, now);
  const reunion = breakdown(localDateFromISO(SILENCE_END), now);
  const anniv = nextAnniversary(RELATIONSHIP_START, now);
  const annivIn = breakdown(now, anniv);
  const annivYears = anniv.getFullYear() - start.getFullYear();


  return (
    <section id="home" className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 pb-20 pt-32 sm:px-8">
      {/* cinematic planets */}
      <div className="pointer-events-none absolute -right-40 top-[6%] opacity-90 sm:-right-24 lg:right-[-6%]">
        <div className="drift">
          <SparklePlanet chapterId="ch-07" size={680} fit="system" zoom={1.15} />
        </div>
      </div>
      <div className="pointer-events-none absolute -left-16 bottom-[8%] hidden opacity-60 md:block">
        <div className="drift" style={{ animationDelay: "-4s" }}>
          <SparklePlanet chapterId="ch-05" size={220} phase={1.2} />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-night via-night/70 to-transparent" />

      <div className="relative mx-auto w-full max-w-7xl">
        <div className="fade-up label !text-gold">A love story in seven chapters · since 09.10.2021</div>

        <h1 className="fade-up display mt-6 text-[clamp(4rem,13vw,11rem)]" style={{ animationDelay: ".1s" }}>
          {settings.hisName}
          <span className="mx-3 italic gold-text sm:mx-5">&</span>
          <br className="sm:hidden" />
          {settings.herName}
        </h1>

        <p className="fade-up mt-8 max-w-xl font-serif text-2xl font-light italic leading-snug text-mist sm:text-[1.75rem]" style={{ animationDelay: ".2s" }}>
          A pizza shop, a “no”, a pendant, a yes — five hundred and eighty-eight days of silence, and the way back. {events.length} moments, kept.
        </p>

        <div className="fade-up mt-16" style={{ animationDelay: ".35s" }}>
          <div className="label mb-6">Together for</div>
          <div className="-mx-3 flex flex-wrap items-end divide-x divide-line sm:-mx-6">
            <Unit value={b.years} label="Years" />
            <Unit value={b.months} label="Months" />
            <Unit value={b.days} label="Days" />
            <Unit value={b.hours} label="Hours" />
            <Unit value={b.minutes} label="Minutes" />
            <Unit value={b.seconds} label="Seconds" />
          </div>
        </div>

        <div className="fade-up mt-16 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4" style={{ animationDelay: ".5s" }}>
          {[
            { k: "Days together", v: b.totalDays.toLocaleString() },
            { k: "Hours together", v: b.totalHours.toLocaleString() },
            { k: "Since the reunion", v: reunion.future ? "—" : `${reunion.totalDays.toLocaleString()} days` },
            { k: `Anniversary ${toOrdinal(annivYears)}`, v: annivIn.totalDays === 0 ? "Today" : `in ${annivIn.totalDays} days` },
          ].map((x) => (
            <div key={x.k} className="bg-night/80 px-5 py-5 backdrop-blur">
              <div className="label !text-[9.5px]">{x.k}</div>
              <div className="mt-2 font-serif text-3xl font-light tabular-nums">{x.v}</div>
            </div>
          ))}
        </div>

        <div className="fade-up mt-12 flex flex-wrap gap-3" style={{ animationDelay: ".6s" }}>
          <a href="#galaxy" className="btn btn-primary">Enter our galaxy</a>
          {isAdmin ? (
            <button onClick={onAddEvent} className="btn btn-ghost">Open the studio</button>
          ) : (
            <a href="#timeline" className="btn btn-ghost">Read our story</a>
          )}
        </div>
      </div>

      <a href="#today" className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-mist transition-colors hover:text-ivory sm:flex">
        <span className="label !text-[9px]">Scroll</span>
        <IArrowDown size={16} className="drift" />
      </a>
    </section>
  );
}

function toOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
